// Replaces `fetchKaminoStats` of src/lib/solana/kamino.ts with sample data; every other export of that module is passed through.
// (overrides.js redirects imports of src/lib/solana/kamino.ts here; this file's own import of it is not redirected.)
export * from "@/lib/solana/kamino";

import { kaminoStats } from "../sample-data";
import { delay } from "../delay";

export async function fetchKaminoStats() {
  await delay();
  return kaminoStats();
}
