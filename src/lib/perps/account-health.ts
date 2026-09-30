import type { PerpsAccount, Side } from "@/types/perps";

export const LIQUIDATION_HEALTH = 1.1;
export const RISKY_HEALTH = 1.3;

export function healthRatio(grossCollateral: bigint, debt: bigint) {
  if (debt === 0n) return Number.POSITIVE_INFINITY;
  return Number((grossCollateral * 10_000n) / debt) / 10_000;
}

export function buildAccount(margin: bigint, borrowed: bigint): PerpsAccount {
  return { margin, borrowed, available: margin - borrowed, health: healthRatio(margin, borrowed) };
}

// Opening a long swaps collateral for the position; a short adds the sale proceeds. Both add the borrowed amount as debt.
export function healthAfterOpen(account: PerpsAccount, side: Side, collateral: bigint, size: bigint) {
  const borrowed = side === "long" ? size - collateral : size;
  const gross = side === "long" ? account.margin - collateral + size : account.margin + size;
  return healthRatio(gross, account.borrowed + borrowed);
}
