import type { ClosedPosition, ClosedSummary, PerpsMarket, PerpsPortfolio, PerpsPosition, PositionSummary } from "@/types/perps";

import { buildAccount } from "./account-health";
import { estimatedLiquidationPrice } from "./order-quote";
import { distanceBps, positionPnl, returnBps, tokensToUsd } from "./position-math";

export function pairOf(symbol: string) {
  return `${symbol}-USDC`;
}

// Entry price and leverage feed the same isolated liquidation estimate the web app shows for an open position.
export function summarizePosition(position: PerpsPosition, market: PerpsMarket): PositionSummary {
  const markPrice = market.markPrice;
  const pnl = positionPnl(position.side, position.tokens, position.entryPrice, markPrice);
  const borrowBps = position.side === "long" ? market.usdcBorrowBps : market.tokenBorrowBps;
  const liquidation = estimatedLiquidationPrice(position.side, position.entryPrice, position.exactLeverage, borrowBps);
  return {
    ...position,
    pair: pairOf(position.symbol),
    markPrice,
    sizeUsd: tokensToUsd(position.tokens, markPrice),
    pnl,
    pnlBps: position.collateral > 0n ? returnBps(pnl, position.collateral) : 0,
    liquidationPrice: liquidation,
    liquidationDistanceBps: distanceBps(markPrice, liquidation),
  };
}

export function summarizeClosed(closed: ClosedPosition): ClosedSummary {
  const pnl = positionPnl(closed.side, closed.tokens, closed.entryPrice, closed.exitPrice);
  return { ...closed, pair: pairOf(closed.symbol), pnl, pnlBps: returnBps(pnl, closed.collateral) };
}

type PortfolioInput = {
  margin: bigint;
  borrowed: bigint;
  markets: readonly PerpsMarket[];
  positions: readonly PerpsPosition[];
  closed: readonly ClosedPosition[];
};

export function summarizePortfolio({ margin, borrowed, markets, positions, closed }: PortfolioInput): PerpsPortfolio {
  const bySymbol = new Map(markets.map((market) => [market.symbol, market]));
  const open = positions.flatMap((position) => {
    const market = bySymbol.get(position.symbol);
    return market === undefined ? [] : [summarizePosition(position, market)];
  });
  const history = closed.map(summarizeClosed);
  const wins = history.filter((entry) => entry.pnl > 0n).length;

  return {
    account: buildAccount(margin, borrowed),
    positionsAvailable: true,
    historyAvailable: true,
    positions: open,
    openPnl: open.reduce((sum, position) => sum + position.pnl, 0n),
    closed: history,
    realizedPnl: history.reduce((sum, entry) => sum + entry.pnl, 0n),
    winRateBps: history.length === 0 ? 0 : Math.round((wins * 10_000) / history.length),
  };
}
