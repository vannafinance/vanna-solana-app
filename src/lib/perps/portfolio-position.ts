import type { PerpPosition } from "@/types/portfolio";
import type { PositionSummary } from "@/types/perps";

const TOKEN_DECIMALS = 6;

// The Home screens list perps and farm positions together; this is the perps half, from the same derived positions the
// Trade tab shows.
export function toPortfolioPosition(position: PositionSummary): PerpPosition {
  return {
    kind: "perp",
    id: position.id,
    symbol: position.symbol,
    pair: position.pair,
    side: position.side,
    leverage: position.leverage,
    openedOn: position.openedOn,
    pnl: position.pnl,
    pnlBps: position.pnlBps,
    size: position.sizeUsd,
    sizeTokens: { raw: position.tokens, decimals: TOKEN_DECIMALS },
    collateral: position.collateral,
    liquidationPrice: position.liquidationPrice,
    liquidationAwayBps: position.liquidationDistanceBps,
    entryPrice: position.entryPrice,
    markPrice: position.markPrice,
  };
}
