import { type Connection, type ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";

import { ApiError } from "./request-json";

export type WalletTransaction = { signature: string; blockTime: number; tx: ParsedTransactionWithMeta };

const PAGE_SIZE = 1000;
// The fork RPC rejects JSON-RPC batches, so transactions are fetched one call each, a few at a time.
const CONCURRENCY = 8;
export const DEFAULT_MAX_SIGNATURES = 1000;
const MISSING_ATTEMPTS = 3;
const MISSING_RETRY_MS = 600;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A confirmed transaction never changes, so each one is parsed from the network once. Refreshing the history then costs one
// signature listing plus the transactions that are new since the last read.
const parsedCache = new Map<string, ParsedTransactionWithMeta>();

// Newest first. Failed transactions are dropped before they are fetched. The block time comes from the
// signature list because the fork reports a truncated one on getTransaction.
export async function fetchWalletTransactions(connection: Connection, wallet: string, maxSignatures = DEFAULT_MAX_SIGNATURES): Promise<WalletTransaction[]> {
  const owner = new PublicKey(wallet);
  const signatures: { signature: string; blockTime: number }[] = [];
  let before: string | undefined;

  try {
    while (signatures.length < maxSignatures) {
      const page = await connection.getSignaturesForAddress(owner, { limit: Math.min(PAGE_SIZE, maxSignatures - signatures.length), before }, "confirmed");
      signatures.push(...page.filter((entry) => !entry.err).map((entry) => ({ signature: entry.signature, blockTime: entry.blockTime ?? 0 })));
      if (page.length < PAGE_SIZE) break;
      before = page[page.length - 1].signature;
    }

    // A transaction listed moments after it confirmed can still read as missing; dropping it would hide what it opened.
    for (let attempt = 0; attempt < MISSING_ATTEMPTS; attempt++) {
      const missing = signatures.filter((entry) => !parsedCache.has(entry.signature));
      if (missing.length === 0) break;
      if (attempt > 0) await sleep(MISSING_RETRY_MS);
      for (let i = 0; i < missing.length; i += CONCURRENCY) {
        const batch = await Promise.all(
          missing.slice(i, i + CONCURRENCY).map((entry) =>
            connection.getParsedTransaction(entry.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }).then((tx) => ({ tx, signature: entry.signature })),
          ),
        );
        for (const { tx, signature } of batch) if (tx && !tx.meta?.err) parsedCache.set(signature, tx);
      }
    }

    return signatures.flatMap(({ signature, blockTime }) => {
      const tx = parsedCache.get(signature);
      return tx ? [{ signature, blockTime, tx }] : [];
    });
  } catch {
    throw new ApiError("network");
  }
}
