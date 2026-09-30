import type { OrderIssue, OrderQuote, PerpsAccount, PerpsMarket, Side } from "@/types/perps";

import { healthAfterOpen, RISKY_HEALTH } from "./account-health";
import { liquidationPrice, usdToTokens } from "./position-math";

const OPEN_FEE_BPS = 3n;

type OrderInput = {
  market: PerpsMarket;
  account: PerpsAccount;
  side: Side;
  collateral: bigint;
  leverage: number;
};

export function quoteOrder({ market, account, side, collateral, leverage }: OrderInput): OrderQuote {
  const size = collateral * BigInt(leverage);
  const tokens = usdToTokens(size, market.markPrice);
  return {
    size,
    tokens,
    liquidationPrice: tokens === 0n ? 0n : liquidationPrice({ side, tokens, collateral, openNotional: size }),
    fee: (size * OPEN_FEE_BPS) / 10_000n,
    healthAfter: healthAfterOpen(account, side, collateral, size),
  };
}

export function orderIssue(account: PerpsAccount, collateral: bigint, quote: OrderQuote): OrderIssue {
  if (collateral === 0n) return "empty";
  if (collateral > account.available) return "insufficient-margin";
  if (quote.healthAfter < RISKY_HEALTH) return "health-low";
  return null;
}
