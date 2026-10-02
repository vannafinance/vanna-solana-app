import { formatShortDate } from "@/format/format-date";
import type { FarmPosition, FarmPositionView } from "@/types/farm";
import type { FarmPosition as PortfolioFarmPosition } from "@/types/portfolio";

import { toPositionView } from "./position-math";

// Liquidation starts when the position's assets fall to this multiple of its debt.
const LIQUIDATION_HEALTH_NUMERATOR = 11n;
const LIQUIDATION_HEALTH_DENOMINATOR = 10n;
const BPS = 10_000n;

// The stock price at which the stock plus what Kamino holds is worth 1.1 times the debt. Zero when what Kamino holds
// alone already covers that, so no fall in the stock can liquidate the position.
function liquidationPrice(view: FarmPositionView): bigint {
  const needed = (view.debtValueUsd * LIQUIDATION_HEALTH_NUMERATOR) / LIQUIDATION_HEALTH_DENOMINATOR - view.suppliedValueUsd;
  if (needed <= 0n || view.collateral.raw === 0n) return 0n;
  return (needed * 10n ** BigInt(view.collateral.decimals)) / view.collateral.raw;
}

// The Home screens list Farm and Perps positions together; this is the Farm half, from the same positions the Farm tab shows.
export function toPortfolioFarmPosition(position: FarmPosition): PortfolioFarmPosition {
  const view = toPositionView(position);
  const liquidation = liquidationPrice(view);
  const price = position.collateralPriceUsd;

  return {
    kind: "farm",
    id: position.id,
    symbol: position.collateralSymbol,
    pair: `${position.collateralSymbol}-${position.poolSymbol}`,
    pool: position.poolSymbol,
    leverage: position.leverage,
    openedOn: formatShortDate(position.openedAt),
    pnl: view.earningsUsd,
    pnlBps: view.netValueUsd > 0n ? Number((view.earningsUsd * BPS) / view.netValueUsd) : 0,
    size: view.collateralValueUsd + view.suppliedValueUsd,
    sizeTokens: view.collateral,
    collateral: view.collateralValueUsd,
    health: view.healthFactor,
    borrowed: view.debtValueUsd,
    netAprBps: view.netAprBps,
    venue: "Kamino",
    liquidationPrice: liquidation,
    liquidationAwayBps: price > 0n && liquidation < price ? Number(((price - liquidation) * BPS) / price) : 0,
  };
}
