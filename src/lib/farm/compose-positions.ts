import type { OraclePrices } from "@/lib/solana/oracle-prices";
import type { KaminoPosition } from "@/lib/solana/farm-positions";
import type { FarmAttribution, FarmPosition, PoolSymbol } from "@/types/farm";

import { toUsd } from "./units";

const SHARE_SCALE = 1_000_000n;

type SupplyRates = Record<PoolSymbol, number | null>;

function leverageOf(equityUsd: bigint, assetsUsd: bigint): number {
  return equityUsd > 0n ? Math.round((Number(assetsUsd) / Number(equityUsd)) * 10) / 10 : 1;
}

// One position per stock a Kamino position was funded for. When two stocks share a pool, each owns the share of the pool's
// supply and debt that matches how much it borrowed when it was opened. A position whose stock cannot be told from
// history, or whose price is unavailable, is left out rather than shown with a made-up figure.
export function composePositions(live: readonly KaminoPosition[], attributions: readonly FarmAttribution[], prices: OraclePrices, supplyApyBps: SupplyRates): FarmPosition[] {
  return live.flatMap((kamino) => {
    const funded = attributions.filter((attribution) => attribution.pool === kamino.pool);
    const poolPrice = prices[kamino.pool];
    const poolDecimals = funded[0]?.borrowed.decimals;
    if (funded.length === 0 || poolPrice === undefined || poolDecimals === undefined) return [];
    const totalBorrowedAtOpen = funded.reduce((sum, attribution) => sum + attribution.borrowed.raw, 0n);

    return funded.flatMap((attribution) => {
      const stockPrice = prices[attribution.stock];
      if (stockPrice === undefined) return [];
      const share = totalBorrowedAtOpen === 0n ? SHARE_SCALE / BigInt(funded.length) : (attribution.borrowed.raw * SHARE_SCALE) / totalBorrowedAtOpen;
      const borrowed = (kamino.debt * share) / SHARE_SCALE;
      const supplied = (kamino.supplied * share) / SHARE_SCALE;
      const principal = borrowed < attribution.borrowed.raw ? borrowed : attribution.borrowed.raw;
      const suppliedUsd = toUsd({ raw: supplied, decimals: poolDecimals }, poolPrice);
      const collateralUsd = toUsd(attribution.collateral, stockPrice);
      const debtUsd = toUsd({ raw: borrowed, decimals: poolDecimals }, poolPrice);

      return [
        {
          id: `farm-${attribution.stock.toLowerCase()}-${kamino.pool.toLowerCase()}`,
          collateralSymbol: attribution.stock,
          poolSymbol: kamino.pool,
          leverage: leverageOf(collateralUsd + suppliedUsd - debtUsd, collateralUsd + suppliedUsd),
          collateral: attribution.collateral,
          collateralPriceUsd: stockPrice,
          principal: { raw: principal, decimals: poolDecimals },
          interest: { raw: borrowed - principal, decimals: poolDecimals },
          supplied: { raw: supplied, decimals: poolDecimals },
          poolPriceUsd: poolPrice,
          supplyApyBps: supplyApyBps[kamino.pool] ?? 0,
          borrowApyBps: kamino.borrowRateBps,
          poolShareBps: Number((share * 10_000n) / SHARE_SCALE),
          openedAt: attribution.openedAt,
        },
      ];
    });
  });
}
