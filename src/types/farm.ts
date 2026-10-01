import type { TokenAmount } from "@/format/format-amount";

export type CollateralSymbol = "TSLAx" | "GOOGLx" | "AAPLx" | "ANTHROPIC" | "OPENAI";
export type PoolSymbol = "USDC" | "SOL";

export type FarmPool = {
  symbol: PoolSymbol;
  market: string;
  decimals: number;
  priceUsd: bigint;
  supplyApyBps: number;
  borrowApyBps: number;
  available: bigint;
  totalSupplied: bigint;
  utilizationBps: number;
};

export type FarmCollateral = {
  symbol: CollateralSymbol;
  decimals: number;
  priceUsd: bigint;
  balance: bigint;
};

export type FarmPosition = {
  id: string;
  collateralSymbol: CollateralSymbol;
  poolSymbol: PoolSymbol;
  leverage: number;
  collateral: TokenAmount;
  collateralPriceUsd: bigint;
  principal: TokenAmount;
  interest: TokenAmount;
  supplied: TokenAmount;
  poolPriceUsd: bigint;
  supplyApyBps: number;
  borrowApyBps: number;
};

export type FarmPositionView = {
  id: string;
  collateralSymbol: CollateralSymbol;
  poolSymbol: PoolSymbol;
  leverage: number;
  healthFactor: number;
  collateral: TokenAmount;
  collateralValueUsd: bigint;
  principal: TokenAmount;
  interest: TokenAmount;
  debt: TokenAmount;
  debtValueUsd: bigint;
  supplied: TokenAmount;
  suppliedValueUsd: bigint;
  yieldEarned: TokenAmount;
  earningsUsd: bigint;
  netValueUsd: bigint;
  supplyApyBps: number;
  borrowApyBps: number;
  netAprBps: number;
};

export type FarmPositionsView = {
  netValueUsd: bigint;
  earningsUsd: bigint;
  netAprBps: number;
  positions: readonly FarmPositionView[];
};

export type DeployIssue = "no-balance" | "over-balance" | "no-amount" | "low-leverage";

export type DeployQuote = {
  collateralValueUsd: bigint;
  debtUsd: bigint;
  borrow: TokenAmount;
  projectedYearlyUsd: bigint;
  projectedMonthlyUsd: bigint;
  netApyBps: number;
  liquidationPriceUsd: bigint;
  healthFactor: number | null;
};

export type DeployForm = {
  pools: readonly FarmPool[];
  collaterals: readonly FarmCollateral[];
  held: readonly FarmCollateral[];
  pool: FarmPool;
  collateral: FarmCollateral;
  amountText: string;
  amount: TokenAmount;
  leverage: number;
  quote: DeployQuote;
  issue: DeployIssue | null;
};

export const EXIT_FRACTIONS_BPS = [2500, 5000, 7500, 10000] as const;
export type ExitFractionBps = (typeof EXIT_FRACTIONS_BPS)[number];

export type CloseQuote = {
  fractionBps: ExitFractionBps;
  redeem: TokenAmount;
  redeemValueUsd: bigint;
  repay: TokenAmount;
  repayValueUsd: bigint;
  collateralReturned: TokenAmount;
  collateralReturnedValueUsd: bigint;
  leftover: TokenAmount;
  remainingDebtValueUsd: bigint;
  healthAfter: number | null;
  receiveValueUsd: bigint;
};

export type CloseView = {
  position: FarmPositionView;
  quote: CloseQuote;
};

export type FarmHistoryKind = "deposit" | "borrow" | "redeem" | "repay" | "withdraw";

export type FarmHistoryAction = {
  kind: FarmHistoryKind;
  symbol: string;
  amount: TokenAmount;
};

export type FarmHistoryEntry = {
  id: string;
  collateralSymbol: CollateralSymbol;
  poolSymbol: PoolSymbol;
  occurredAt: number;
  signature: string;
  actions: readonly FarmHistoryAction[];
};

export type FarmHistoryView = {
  earnedUsd: bigint;
  closedCount: number;
  openCount: number;
  entries: readonly FarmHistoryEntry[];
};
