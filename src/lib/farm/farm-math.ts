import type { TokenAmount } from "@/format/format-amount";
import type { CollateralSymbol, DeployQuote, FarmCollateral, FarmPool } from "@/types/farm";

import { BPS, fromUsd, toUsd } from "./units";

export const MIN_LEVERAGE = 1;
export const MAX_LEVERAGE = 5;

export function healthFactor(leverage: number): number | null {
  return leverage > MIN_LEVERAGE ? leverage / (leverage - 1) : null;
}

export function netAprBps(supplyApyBps: number, borrowApyBps: number): number {
  return supplyApyBps - borrowApyBps;
}

const LIQUIDATION_PRICE_DIVISOR = 10n;

export function liquidationPriceUsd(collateralPriceUsd: bigint, leverage: number): bigint {
  return (collateralPriceUsd * BigInt(Math.max(leverage - MIN_LEVERAGE, 0))) / LIQUIDATION_PRICE_DIVISOR;
}

export function heldCollaterals(collaterals: readonly FarmCollateral[]): readonly FarmCollateral[] {
  const held = collaterals.filter((collateral) => collateral.balance > 0n);
  return held.length > 0 ? held : collaterals;
}

export function stepHeld(held: readonly FarmCollateral[], current: CollateralSymbol, direction: 1 | -1): CollateralSymbol {
  const index = held.findIndex((collateral) => collateral.symbol === current);
  const next = (((index < 0 ? 0 : index + direction) % held.length) + held.length) % held.length;
  return held[next].symbol;
}

type QuoteInput = {
  collateral: TokenAmount;
  collateralPriceUsd: bigint;
  leverage: number;
  pool: FarmPool;
};

export function deployQuote({ collateral, collateralPriceUsd, leverage, pool }: QuoteInput): DeployQuote {
  const collateralValueUsd = toUsd(collateral, collateralPriceUsd);
  const debtUsd = collateralValueUsd * BigInt(leverage - MIN_LEVERAGE);
  const projectedYearlyUsd = (debtUsd * BigInt(netAprBps(pool.supplyApyBps, pool.borrowApyBps))) / BPS;

  return {
    collateralValueUsd,
    debtUsd,
    borrow: fromUsd(debtUsd, pool.priceUsd, pool.decimals),
    projectedYearlyUsd,
    projectedMonthlyUsd: projectedYearlyUsd / 12n,
    netApyBps: (leverage - MIN_LEVERAGE) * netAprBps(pool.supplyApyBps, pool.borrowApyBps),
    liquidationPriceUsd: liquidationPriceUsd(collateralPriceUsd, leverage),
    healthFactor: healthFactor(leverage),
  };
}
