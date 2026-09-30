import type { EarnPortfolioSummary, EarnPosition } from "@/types/earn";

export function summarizePortfolio(positions: readonly EarnPosition[], walletUsd: bigint): EarnPortfolioSummary {
  const suppliedUsd = positions.reduce((total, position) => total + position.valueUsd, 0n);
  const weightedApy = positions.reduce((total, position) => total + position.valueUsd * BigInt(position.supplyApyBps), 0n);
  const averageSupplyApyBps = suppliedUsd === 0n ? 0 : Number((weightedApy + suppliedUsd / 2n) / suppliedUsd);

  return {
    suppliedUsd,
    totalHoldingsUsd: suppliedUsd + walletUsd,
    assetCount: positions.length,
    averageSupplyApyBps,
  };
}

export function totalEarnedUsd(positions: readonly EarnPosition[]): bigint {
  return positions.reduce((total, position) => total + position.earnedUsd, 0n);
}
