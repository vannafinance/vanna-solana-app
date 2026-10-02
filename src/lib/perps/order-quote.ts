import type { OrderIssue, OrderQuote, PerpsMarket, Side } from "@/types/perps";

import { healthRatio, LIQUIDATION_HEALTH, MIN_OPEN_HEALTH } from "./account-health";
import { UNIT, usdToTokens } from "./position-math";

type OrderInput = {
  market: PerpsMarket;
  margin: bigint;
  borrowed: bigint;
  side: Side;
  collateral: bigint;
  leverage: number;
};

// The web app's preview estimate for a position on its own, in closed form. A long's debt is USDC and its collateral is
// the stock; a short is the mirror image, so the two do not share a shape. Each projects about a year of borrow interest.
// Display only, so floating point is fine here.
export function estimatedLiquidationPrice(side: Side, markPrice: bigint, leverage: number, borrowBps: number): bigint {
  if (leverage <= 1) return 0n;
  const open = Number(markPrice) / Number(UNIT);
  const interest = 1 + borrowBps / 10_000;
  const price =
    side === "long"
      ? open * LIQUIDATION_HEALTH * ((leverage - 1) / leverage) * interest
      : (open * leverage) / (LIQUIDATION_HEALTH * (leverage - 1) * interest);
  return Number.isFinite(price) && price > 0 ? BigInt(Math.round(price * Number(UNIT))) : 0n;
}

// Same projection as the web app: the whole swapped amount (deposit plus borrow) lands as collateral and only the
// borrowed leg is new debt, on both sides.
export function quoteOrder({ market, margin, borrowed, side, collateral, leverage }: OrderInput): OrderQuote {
  const size = collateral * BigInt(leverage);
  const newDebt = collateral * BigInt(leverage - 1);
  return {
    size,
    tokens: usdToTokens(size, market.markPrice),
    liquidationPrice: estimatedLiquidationPrice(side, market.markPrice, leverage, side === "long" ? market.usdcBorrowBps : market.tokenBorrowBps),
    fee: 0n,
    healthAfter: healthRatio(margin + size, borrowed + newDebt),
  };
}

export function orderIssue(available: bigint, collateral: bigint, quote: OrderQuote): OrderIssue {
  if (collateral === 0n) return "empty";
  if (collateral > available) return "insufficient-margin";
  if (quote.healthAfter <= MIN_OPEN_HEALTH) return "health-low";
  return null;
}
