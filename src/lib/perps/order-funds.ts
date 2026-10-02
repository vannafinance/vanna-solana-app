import type { Side } from "@/types/perps";

import { UNIT } from "./position-math";

export type OrderFunds = {
  // What the wallet can commit as collateral, in USD units: USDC for a long, the stock for a short.
  usd: bigint;
  raw: bigint;
  decimals: number;
};

type Holding = { symbol: string; raw: bigint; decimals: number };

// Collateral comes from the wallet, as on the web app: a long deposits USDC, a short deposits the stock itself.
export function orderFunds(side: Side, stockSymbol: string, price: bigint, holdings: readonly Holding[]): OrderFunds {
  const symbol = side === "long" ? "USDC" : stockSymbol;
  const held = holdings.find((holding) => holding.symbol === symbol);
  if (!held) return { usd: 0n, raw: 0n, decimals: side === "long" ? 6 : 0 };
  const usd = side === "long" ? (held.raw * UNIT) / 10n ** BigInt(held.decimals) : (held.raw * price) / 10n ** BigInt(held.decimals);
  return { usd, raw: held.raw, decimals: held.decimals };
}

// The amount typed is in USD; the transaction needs base units of the collateral asset. Committing the full balance
// uses the exact holding so rounding never leaves dust or asks for more than the wallet has.
export function collateralBaseUnits(side: Side, funds: OrderFunds, collateralUsd: bigint, price: bigint): bigint {
  if (collateralUsd >= funds.usd) return funds.raw;
  return side === "long" ? (collateralUsd * 10n ** BigInt(funds.decimals)) / UNIT : (collateralUsd * 10n ** BigInt(funds.decimals)) / price;
}
