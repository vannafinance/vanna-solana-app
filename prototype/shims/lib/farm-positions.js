// Replaces `fetchKaminoPositions` of src/lib/solana/farm-positions.ts with sample data; every other export of that module is passed through.
// (overrides.js redirects imports of src/lib/solana/farm-positions.ts here; this file's own import of it is not redirected.)
export * from "@/lib/solana/farm-positions";

import { kaminoPositions } from "../sample-data";
import { delay } from "../delay";

export async function fetchKaminoPositions() {
  await delay();
  return kaminoPositions();
}
