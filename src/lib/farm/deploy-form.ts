import { parseUnits, type TokenAmount } from "@/format/format-amount";
import type { CollateralSymbol, DeployForm, DeployIssue, DeployQuote, FarmCollateral, FarmPool, PoolSymbol } from "@/types/farm";

import { accountAfterDeploy, deployQuote, heldCollaterals } from "./farm-math";

// Below this the web app refuses to open a position; liquidation starts at 1.1.
const MIN_OPENING_HEALTH = 1.15;

type DeployInput = {
  pools: readonly FarmPool[];
  collaterals: readonly FarmCollateral[];
  poolSymbol: PoolSymbol;
  collateralSymbol: CollateralSymbol;
  amountText: string;
  leverage: number;
  // What the margin account already holds and owes, in USD units, so a new position is judged together with the old ones.
  account: { collateralUsd: bigint; debtUsd: bigint };
};

function findBySymbol<T extends { symbol: string }>(items: readonly T[], symbol: string): T {
  const match = items.find((item) => item.symbol === symbol);
  if (!match) throw new Error(`Unknown farm asset ${symbol}`);
  return match;
}

function findIssue(collateral: FarmCollateral, pool: FarmPool, amount: bigint, leverage: number, quote: DeployQuote, account: DeployInput["account"]): DeployIssue | null {
  if (collateral.balance <= 0n) return "no-balance";
  if (amount > collateral.balance) return "over-balance";
  if (amount <= 0n) return "no-amount";
  if (quote.borrow.raw > pool.borrowable) return "pool-liquidity";
  const { health } = accountAfterDeploy({ ...account, netUsd: account.collateralUsd - account.debtUsd }, quote);
  if (health !== null && health <= MIN_OPENING_HEALTH) return "too-risky";
  return null;
}

export function buildDeployForm({ pools, collaterals, poolSymbol, collateralSymbol, amountText, leverage, account }: DeployInput): DeployForm {
  const pool = findBySymbol(pools, poolSymbol);
  const collateral = findBySymbol(collaterals, collateralSymbol);
  const amount: TokenAmount = { raw: parseUnits(amountText, collateral.decimals) ?? 0n, decimals: collateral.decimals };

  const quote = deployQuote({ collateral: amount, collateralPriceUsd: collateral.priceUsd, leverage, pool });

  return {
    pools,
    collaterals,
    held: heldCollaterals(collaterals),
    pool,
    collateral,
    amountText,
    amount,
    leverage,
    quote,
    issue: findIssue(collateral, pool, amount.raw, leverage, quote, account),
  };
}
