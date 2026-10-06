import type { TokenAmount } from "@/format/format-amount";
import type { CollateralSymbol, DeployQuote, FarmCollateral, FarmPool, MarginNow } from "@/types/farm";

import { BPS, fromUsd, toUsd } from "./units";

export const MIN_LEVERAGE = 1;
export const MAX_LEVERAGE = 5;

// A fresh position holds the stock plus the borrowed amount in Kamino, against the borrowed amount: L ÷ (L - 1).
export function healthFactor(leverage: number): number | null {
  return leverage > MIN_LEVERAGE ? leverage / (leverage - 1) : null;
}

export function netAprBps(supplyApyBps: number, borrowApyBps: number): number {
  return supplyApyBps - borrowApyBps;
}

// The stock itself earns nothing here, so the return on the deposit is the spread earned on what is borrowed:
// (L - 1) × (Kamino supply APY - Vanna borrow APY).
export function netApyAtLeverageBps(supplyApyBps: number, borrowApyBps: number, leverage: number): number {
  return Math.max(leverage - MIN_LEVERAGE, 0) * netAprBps(supplyApyBps, borrowApyBps);
}

// Liquidation is at health 1.10. Kamino holds as much as was borrowed, so the stock only has to cover the extra 10% of
// the debt: price × (L - 1) ÷ 10. At 4x that is 30% of today's price, a 70% drop.
const LIQUIDATION_PRICE_DIVISOR = 10n;

export function liquidationPriceUsd(collateralPriceUsd: bigint, leverage: number): bigint {
  return (collateralPriceUsd * BigInt(Math.max(leverage - MIN_LEVERAGE, 0))) / LIQUIDATION_PRICE_DIVISOR;
}

export function liquidationDropBps(leverage: number): number {
  return Math.max(0, Number(BPS) - Math.max(leverage - MIN_LEVERAGE, 0) * (Number(BPS) / Number(LIQUIDATION_PRICE_DIVISOR)));
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

// Borrowed = deposit value × (L - 1); all of it is supplied to Kamino. At 1x nothing is borrowed: the deposit itself is
// swapped into the pool asset and supplied, so it earns the full supply APY with no loan and nothing to liquidate.
export function deployQuote({ collateral, collateralPriceUsd, leverage, pool }: QuoteInput): DeployQuote {
  const collateralValueUsd = toUsd(collateral, collateralPriceUsd);
  const debtUsd = collateralValueUsd * BigInt(leverage - MIN_LEVERAGE);
  const plain = leverage <= MIN_LEVERAGE;
  const suppliedUsd = plain ? collateralValueUsd : debtUsd;
  const projectedYearlyUsd = plain ? (collateralValueUsd * BigInt(pool.supplyApyBps)) / BPS : (debtUsd * BigInt(netAprBps(pool.supplyApyBps, pool.borrowApyBps))) / BPS;

  return {
    collateralValueUsd,
    debtUsd,
    borrow: fromUsd(debtUsd, pool.priceUsd, pool.decimals),
    supplied: fromUsd(suppliedUsd, pool.priceUsd, pool.decimals),
    suppliedUsd,
    projectedYearlyUsd,
    projectedMonthlyUsd: projectedYearlyUsd / 12n,
    netApyBps: plain ? pool.supplyApyBps : netApyAtLeverageBps(pool.supplyApyBps, pool.borrowApyBps, leverage),
    liquidationPriceUsd: liquidationPriceUsd(collateralPriceUsd, leverage),
    liquidationDropBps: liquidationDropBps(leverage),
    healthFactor: healthFactor(leverage),
  };
}

// The whole margin account after a deploy: it gains the stock and the Kamino supply, and owes the new borrow on top of its
// old debt. Health = everything held ÷ everything owed; leverage = everything held ÷ the user's own part of it.
export function accountAfterDeploy(account: Pick<MarginNow, "collateralUsd" | "debtUsd" | "netUsd">, quote: Pick<DeployQuote, "collateralValueUsd" | "debtUsd">) {
  const assets = account.collateralUsd + quote.collateralValueUsd + quote.debtUsd;
  const debt = account.debtUsd + quote.debtUsd;
  const net = account.netUsd + quote.collateralValueUsd;
  return {
    health: debt > 0n ? Number(assets) / Number(debt) : null,
    leverage: net > 0n ? Number(assets) / Number(net) : 1,
  };
}
