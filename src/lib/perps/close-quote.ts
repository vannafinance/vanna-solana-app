import type { CloseQuote, PositionSummary } from "@/types/perps";

import { tokensToUsd } from "./position-math";

// A position's collateral is its current equity, which already includes the unrealized PnL, so that share of it is what
// the wallet receives. There is no closing fee on the web app, and what is left after the debt is repaid goes to the wallet.
export function quoteClose(position: PositionSummary, fractionBps: number): CloseQuote {
  const fraction = BigInt(fractionBps);
  const tokens = (position.tokens * fraction) / 10_000n;

  return {
    fractionBps,
    tokens,
    size: tokensToUsd(tokens, position.markPrice),
    pnl: (position.pnl * fraction) / 10_000n,
    fee: 0n,
    toWallet: (position.collateral * fraction) / 10_000n,
    liquidationPrice: position.liquidationPrice,
  };
}
