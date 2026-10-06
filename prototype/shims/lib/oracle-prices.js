// Replaces `fetchOraclePrices` of src/lib/solana/oracle-prices.ts with sample data; every other export of that module is passed through.
// (overrides.js redirects imports of src/lib/solana/oracle-prices.ts here; this file's own import of it is not redirected.)
export * from "@/lib/solana/oracle-prices";

import { oraclePrices } from "../sample-data";
import { delay } from "../delay";

export async function fetchOraclePrices() {
  await delay();
  return oraclePrices();
}
