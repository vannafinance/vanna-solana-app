import { formatShortDate } from "@/format/format-date";
import type { FarmPosition } from "@/types/farm";
import type { FarmPosition as PortfolioFarmPosition } from "@/types/portfolio";

import { toPositionView } from "./position-math";

const BPS = 10_000n;

// The Home screens list Farm and Perps positions together; this is the Farm half, from the same positions the Farm tab shows.
export function toPortfolioFarmPosition(position: FarmPosition): PortfolioFarmPosition {
  const view = toPositionView(position);

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
    liquidationPrice: view.liquidationPriceUsd,
    liquidationAwayBps: view.liquidationAwayBps,
  };
}
