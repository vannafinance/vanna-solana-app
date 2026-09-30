import { parseUnits, type TokenAmount } from "@/format/format-amount";
import type { CollateralSymbol, DeployForm, DeployIssue, FarmCollateral, FarmPool, PoolSymbol } from "@/types/farm";

import { deployQuote, MIN_LEVERAGE } from "./farm-math";

type DeployInput = {
  pools: readonly FarmPool[];
  collaterals: readonly FarmCollateral[];
  poolSymbol: PoolSymbol;
  collateralSymbol: CollateralSymbol;
  amountText: string;
  leverage: number;
};

function findBySymbol<T extends { symbol: string }>(items: readonly T[], symbol: string): T {
  const match = items.find((item) => item.symbol === symbol);
  if (!match) throw new Error(`Unknown farm asset ${symbol}`);
  return match;
}

function findIssue(collateral: FarmCollateral, amount: bigint, leverage: number): DeployIssue | null {
  if (collateral.balance <= 0n) return "no-balance";
  if (amount > collateral.balance) return "over-balance";
  if (amount <= 0n) return "no-amount";
  if (leverage <= MIN_LEVERAGE) return "low-leverage";
  return null;
}

export function buildDeployForm({ pools, collaterals, poolSymbol, collateralSymbol, amountText, leverage }: DeployInput): DeployForm {
  const pool = findBySymbol(pools, poolSymbol);
  const collateral = findBySymbol(collaterals, collateralSymbol);
  const amount: TokenAmount = { raw: parseUnits(amountText, collateral.decimals) ?? 0n, decimals: collateral.decimals };

  return {
    pools,
    collaterals,
    pool,
    collateral,
    amountText,
    amount,
    leverage,
    quote: deployQuote({ collateral: amount, collateralPriceUsd: collateral.priceUsd, leverage, pool }),
    issue: findIssue(collateral, amount.raw, leverage),
  };
}
