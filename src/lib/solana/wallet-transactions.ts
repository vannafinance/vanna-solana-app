import { type Connection, type ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";

import { ApiError } from "./request-json";

// A transaction that landed but failed changed nothing on chain; it is kept so a history can show it as failed.
export type WalletTransactionStatus = "success" | "failed";

export type WalletTransaction = { signature: string; blockTime: number; status: WalletTransactionStatus; tx: ParsedTransactionWithMeta };

// What every reader that rebuilds balances or positions works from: failed transactions moved nothing.
export function succeededOnly(transactions: readonly WalletTransaction[]): WalletTransaction[] {
  return transactions.filter((transaction) => transaction.status !== "failed");
}

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

// Newest first, failed ones included and marked (see succeededOnly). The block time comes from the signature list because
// the fork reports a truncated one on getTransaction.
export async function fetchWalletTransactions(connection: Connection, wallet: string, maxSignatures = DEFAULT_MAX_SIGNATURES): Promise<WalletTransaction[]> {
  const owner = new PublicKey(wallet);
  const signatures: { signature: string; blockTime: number; failed: boolean }[] = [];
  let before: string | undefined;

  try {
    while (signatures.length < maxSignatures) {
      const page = await connection.getSignaturesForAddress(owner, { limit: Math.min(PAGE_SIZE, maxSignatures - signatures.length), before }, "confirmed");
      signatures.push(...page.map((entry) => ({ signature: entry.signature, blockTime: entry.blockTime ?? 0, failed: Boolean(entry.err) })));
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
        for (const { tx, signature } of batch) if (tx) parsedCache.set(signature, tx);
      }
    }

    return signatures.flatMap(({ signature, blockTime, failed }) => {
      const tx = parsedCache.get(signature);
      return tx ? [{ signature, blockTime, status: failed || tx.meta?.err ? ("failed" as const) : ("success" as const), tx }] : [];
    });
  } catch {
    throw new ApiError("network");
  }
}
