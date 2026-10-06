// Replaces `fetchHoldings` of src/lib/solana/wallet-holdings.ts with sample data; every other export of that module is passed through.
// (overrides.js redirects imports of src/lib/solana/wallet-holdings.ts here; this file's own import of it is not redirected.)
export * from "@/lib/solana/wallet-holdings";

import { holdings } from "../sample-data";
import { delay } from "../delay";

export async function fetchHoldings() {
  await delay();
  return holdings();
}
