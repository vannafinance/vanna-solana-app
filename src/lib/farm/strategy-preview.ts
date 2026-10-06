import type { DeployForm, DeployIssue, MarginNow, StrategyPreview } from "@/types/farm";

import { accountAfterDeploy } from "./farm-math";

// Issues that leave no amount to work from: the preview shows dashes rather than figures for a deposit that cannot happen.
const NO_AMOUNT: readonly DeployIssue[] = ["no-amount", "no-balance", "over-balance"];

// Live figures for the Deploy screen. Null when there is no valid amount yet. The account's current health and leverage
// are only given while it has debt; with none, there is nothing to compare against and only the new figures are shown.
export function strategyPreview(form: DeployForm, account: MarginNow): StrategyPreview | null {
  if (form.amount.raw <= 0n || (form.issue !== null && NO_AMOUNT.includes(form.issue))) return null;
  const { pool, quote } = form;
  const after = accountAfterDeploy(account.hasAccount ? account : { collateralUsd: 0n, debtUsd: 0n, netUsd: 0n }, quote);
  const comparable = account.hasAccount && account.debtUsd > 0n;

  return {
    borrow: quote.borrow,
    borrowUsd: quote.debtUsd,
    borrowApyBps: pool.borrowApyBps,
    supplied: quote.supplied,
    suppliedUsd: quote.suppliedUsd,
    supplyApyBps: pool.supplyApyBps,
    yearlyNetUsd: quote.projectedYearlyUsd,
    netApyBps: quote.netApyBps,
    leverage: { now: comparable ? account.leverage : null, after: after.leverage },
    health: { now: comparable ? account.health : null, after: after.health },
    liquidationPriceUsd: quote.liquidationPriceUsd,
    liquidationDropBps: quote.liquidationDropBps,
  };
}
