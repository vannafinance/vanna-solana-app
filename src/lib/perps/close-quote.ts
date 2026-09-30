import type { CloseQuote, PositionSummary } from "@/types/perps";

import { tokensToUsd } from "./position-math";

const CLOSE_FEE_BPS = 6n;

export function quoteClose(position: PositionSummary, fractionBps: number): CloseQuote {
  const fraction = BigInt(fractionBps);
  const tokens = (position.tokens * fraction) / 10_000n;
  const size = tokensToUsd(tokens, position.markPrice);
  const pnl = (position.pnl * fraction) / 10_000n;
  const fee = (size * CLOSE_FEE_BPS) / 10_000n;
  const released = (position.collateral * fraction) / 10_000n;

  return { fractionBps, tokens, size, pnl, fee, toMargin: released + pnl - fee, liquidationPrice: position.liquidationPrice };
}
