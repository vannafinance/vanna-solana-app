import type { EarnPortfolioSummary, EarnPosition } from "@/types/earn";

export function summarizePortfolio(positions: readonly EarnPosition[], walletUsd: bigint | null): EarnPortfolioSummary {
  const suppliedUsd = positions.reduce((total, position) => total + position.valueUsd, 0n);
  const weightedApy = positions.reduce((total, position) => total + position.valueUsd * BigInt(position.supplyApyBps), 0n);
  const averageSupplyApyBps = suppliedUsd === 0n ? 0 : Number((weightedApy + suppliedUsd / 2n) / suppliedUsd);

  return {
    suppliedUsd,
    totalHoldingsUsd: walletUsd === null ? null : suppliedUsd + walletUsd,
    assetCount: positions.length,
    averageSupplyApyBps,
  };
}

// One unknown position makes the total unknown: a partial sum would understate it.
export function totalEarnedUsd(positions: readonly EarnPosition[]): bigint | null {
  if (positions.some((position) => position.earnedUsd === null)) return null;
  return positions.reduce((total, position) => total + (position.earnedUsd ?? 0n), 0n);
}
