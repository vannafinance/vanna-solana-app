import type { ClosedPosition, ClosedSummary, PerpsMarket, PerpsPortfolio, PerpsPosition, PositionSummary } from "@/types/perps";

import { buildAccount } from "./account-health";
import { distanceBps, liquidationPrice, positionPnl, returnBps, tokensToUsd } from "./position-math";

export function pairOf(symbol: string) {
  return `${symbol}-USDC`;
}

export function summarizePosition(position: PerpsPosition, markPrice: bigint): PositionSummary {
  const pnl = positionPnl(position.side, position.tokens, position.entryPrice, markPrice);
  const liquidation = liquidationPrice({
    side: position.side,
    tokens: position.tokens,
    collateral: position.collateral,
    openNotional: position.collateral * BigInt(position.leverage),
  });
  return {
    ...position,
    pair: pairOf(position.symbol),
    markPrice,
    sizeUsd: tokensToUsd(position.tokens, markPrice),
    pnl,
    pnlBps: returnBps(pnl, position.collateral),
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
  const marks = new Map(markets.map((market) => [market.symbol, market.markPrice]));
  const open = positions.flatMap((position) => {
    const mark = marks.get(position.symbol);
    return mark === undefined ? [] : [summarizePosition(position, mark)];
  });
  const history = closed.map(summarizeClosed);
  const wins = history.filter((entry) => entry.pnl > 0n).length;

  return {
    account: buildAccount(margin, borrowed),
    positions: open,
    openPnl: open.reduce((sum, position) => sum + position.pnl, 0n),
    closed: history,
    realizedPnl: history.reduce((sum, entry) => sum + entry.pnl, 0n),
    winRateBps: history.length === 0 ? 0 : Math.round((wins * 10_000) / history.length),
  };
}
