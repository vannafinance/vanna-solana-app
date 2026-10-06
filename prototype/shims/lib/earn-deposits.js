// Replaces `fetchShareBalances` of src/lib/solana/earn-deposits.ts with sample data; every other export of that module is passed through.
// (overrides.js redirects imports of src/lib/solana/earn-deposits.ts here; this file's own import of it is not redirected.)
export * from "@/lib/solana/earn-deposits";

import { shareBalances } from "../sample-data";
import { delay } from "../delay";

export async function fetchShareBalances() {
  await delay();
  return shareBalances();
}
