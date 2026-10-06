// Replaces `fetchWalletTransactions` of src/lib/solana/wallet-transactions.ts with sample data; every other export of that module is passed through.
// (overrides.js redirects imports of src/lib/solana/wallet-transactions.ts here; this file's own import of it is not redirected.)
export * from "@/lib/solana/wallet-transactions";

import { walletTransactions } from "../sample-data";
import { delay } from "../delay";

// Marked like the real fetch: a transaction whose meta carries an error landed but failed.
export async function fetchWalletTransactions() {
  await delay();
  return walletTransactions().map((entry) => ({ ...entry, status: entry.tx.meta.err ? "failed" : "success" }));
}
