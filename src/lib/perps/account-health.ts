import type { PerpsAccount } from "@/types/perps";

export const LIQUIDATION_HEALTH = 1.1;
// The web app refuses to open a position that would leave the account at or below this health.
export const MIN_OPEN_HEALTH = 1.15;

export function healthRatio(grossCollateral: bigint, debt: bigint) {
  if (debt === 0n) return Number.POSITIVE_INFINITY;
  return Number((grossCollateral * 10_000n) / debt) / 10_000;
}

export function buildAccount(margin: bigint, borrowed: bigint): PerpsAccount {
  return { margin, borrowed, available: margin - borrowed, health: healthRatio(margin, borrowed) };
}
