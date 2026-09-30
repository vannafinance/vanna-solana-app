import type { TokenAmount } from "@/format/format-amount";
import type { DeployQuote, FarmPool } from "@/types/farm";

import { BPS, fromUsd, toUsd } from "./units";

export const MIN_LEVERAGE = 1;
export const MAX_LEVERAGE = 5;

export function healthFactor(leverage: number): number | null {
  return leverage > MIN_LEVERAGE ? leverage / (leverage - 1) : null;
}

export function netAprBps(supplyApyBps: number, borrowApyBps: number): number {
  return supplyApyBps - borrowApyBps;
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
    healthFactor: healthFactor(leverage),
  };
}
