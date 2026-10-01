import { type Connection, type ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";

import { ApiError } from "./request-json";

export type WalletTransaction = { signature: string; blockTime: number; tx: ParsedTransactionWithMeta };

const PAGE_SIZE = 1000;
// The fork RPC rejects JSON-RPC batches, so transactions are fetched one call each, a few at a time.
const CONCURRENCY = 8;
export const DEFAULT_MAX_SIGNATURES = 1000;

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

    const transactions: WalletTransaction[] = [];
    for (let i = 0; i < signatures.length; i += CONCURRENCY) {
      const batch = await Promise.all(
        signatures.slice(i, i + CONCURRENCY).map((entry) =>
          connection.getParsedTransaction(entry.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }).then((tx) => ({ tx, ...entry })),
        ),
      );
      for (const { tx, signature, blockTime } of batch) if (tx && !tx.meta?.err) transactions.push({ signature, blockTime, tx });
    }
    return transactions;
  } catch {
    throw new ApiError("network");
  }
}
