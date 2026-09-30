import type { Side } from "@/types/perps";

export const UNIT = 1_000_000n;

export function usdToTokens(amountUsd: bigint, price: bigint) {
  return (amountUsd * UNIT) / price;
}

export function tokensToUsd(tokens: bigint, price: bigint) {
  return (tokens * price) / UNIT;
}

export function divideRounded(numerator: bigint, denominator: bigint) {
  const half = denominator / 2n;
  return (numerator >= 0n ? numerator + half : numerator - half) / denominator;
}

export function positionPnl(side: Side, tokens: bigint, entryPrice: bigint, markPrice: bigint) {
  const move = side === "long" ? markPrice - entryPrice : entryPrice - markPrice;
  return tokensToUsd(tokens, move);
}

export function returnBps(pnl: bigint, collateral: bigint) {
  return Number(divideRounded(pnl * 10_000n, collateral));
}

type LiquidationInput = {
  side: Side;
  tokens: bigint;
  collateral: bigint;
  openNotional: bigint;
};

// The position liquidates when its own health (assets / debt) falls to 1.10.
export function liquidationPrice({ side, tokens, collateral, openNotional }: LiquidationInput) {
  if (side === "long") {
    const debt = openNotional - collateral;
    return (11n * debt * UNIT) / (10n * tokens);
  }
  return (10n * (collateral + openNotional) * UNIT) / (11n * tokens);
}

export function distanceBps(markPrice: bigint, liquidation: bigint) {
  const gap = markPrice > liquidation ? markPrice - liquidation : liquidation - markPrice;
  return Number((gap * 10_000n) / markPrice);
}
