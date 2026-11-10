import { PX } from "@/sample/data";

// Perps are priced from Phoenix's mark price (as the website does), not from the fork oracle PX. live.ts fills PERP_MARK from the
// Phoenix market snapshot; until the first frame arrives (or for a symbol Phoenix did not return) the oracle price is the fallback.
// Spot and everything non-perp keep PX.
export const PERP_MARK: Record<string, number> = {};
export const perpMark = (k: string) => PERP_MARK[k] ?? PX[k] ?? 0;
