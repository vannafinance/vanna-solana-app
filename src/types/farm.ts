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
  // What Vanna's own reserve can still lend of this asset; a borrow above it is refused by the program.
  borrowable: bigint;
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
  // Which part of the pool's single Kamino position is this stock's, in basis points. Closing it exits that part only.
  poolShareBps: number;
  openedAt: number;
};

// What the margin account's own history says went into a position: the stock deposited and the pool asset borrowed for it.
export type FarmAttribution = {
  stock: CollateralSymbol;
  pool: PoolSymbol;
  collateral: TokenAmount;
  borrowed: TokenAmount;
  // Unix seconds of the first transaction that opened it.
  openedAt: number;
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
  // Borrow interest accrued on the loan so far: what is owed beyond what was borrowed.
  interest: TokenAmount;
  interestValueUsd: bigint;
  debt: TokenAmount;
  debtValueUsd: bigint;
  supplied: TokenAmount;
  suppliedValueUsd: bigint;
  yieldEarned: TokenAmount;
  earningsUsd: bigint;
  netValueUsd: bigint;
  supplyApyBps: number;
  borrowApyBps: number;
  // Kamino supply APY minus Vanna borrow APY: what the loan itself earns.
  netAprBps: number;
  collateralPriceUsd: bigint;
  // The stock price at which this position's health falls to 1.10, and how far below today's price that is. Zero (and
  // 100% away) when Kamino's supply alone covers the debt, so no fall in the stock can liquidate it.
  liquidationPriceUsd: bigint;
  liquidationAwayBps: number;
  // Kamino's yield on the supply minus Vanna's interest on the debt for a year at today's rates, and that as a share of
  // the stock deposited.
  yearlyNetUsd: bigint;
  netApyBps: number;
};

// A Kamino position that is on the chain but whose stock cannot be told from the transactions the app reads.
export type UnplacedFarmPosition = {
  pool: PoolSymbol;
  supplied: TokenAmount;
  debt: TokenAmount;
};

export type FarmPositionsView = {
  netValueUsd: bigint;
  earningsUsd: bigint;
  netAprBps: number;
  positions: readonly FarmPositionView[];
  unplaced: readonly UnplacedFarmPosition[];
};

export type DeployIssue = "no-balance" | "over-balance" | "no-amount" | "too-risky" | "pool-liquidity";

export type DeployQuote = {
  collateralValueUsd: bigint;
  debtUsd: bigint;
  // Borrowed from Vanna and supplied to Kamino in full, so it is also the amount supplied.
  borrow: TokenAmount;
  projectedYearlyUsd: bigint;
  projectedMonthlyUsd: bigint;
  // The projected yearly return as a share of the deposit.
  netApyBps: number;
  liquidationPriceUsd: bigint;
  // How far the stock can fall from today's price before the position's health reaches 1.10.
  liquidationDropBps: number;
  healthFactor: number | null;
};

// The margin account as it stands before a deploy, in USD units. Margin trade and Farm share it, so a new position is judged
// together with everything already in it.
export type MarginNow = {
  hasAccount: boolean;
  collateralUsd: bigint;
  debtUsd: bigint;
  netUsd: bigint;
  health: number | null;
  leverage: number | null;
};

// What the Deploy screen shows as the amount and leverage change: where the money goes, what it should earn, and how the
// whole margin account moves. `now` is null when the account has no debt yet, so only the new figure is shown.
export type StrategyPreview = {
  borrow: TokenAmount;
  borrowUsd: bigint;
  borrowApyBps: number;
  supplied: TokenAmount;
  suppliedUsd: bigint;
  supplyApyBps: number;
  yearlyNetUsd: bigint;
  netApyBps: number;
  leverage: { now: number | null; after: number };
  health: { now: number | null; after: number | null };
  liquidationPriceUsd: bigint;
  liquidationDropBps: number;
};

// One Kamino pool a stock can be farmed into, as the Pools page lists it.
export type FarmPoolRow = {
  pool: FarmPool;
  totalSuppliedUsd: bigint;
  maxLeverage: number;
  // Net APY on the deposit at the highest leverage. Negative when Vanna's borrow costs more than Kamino pays.
  maxNetApyBps: number;
  // What the user holds in this pool (stock plus Kamino supply minus debt); null when they hold nothing here.
  yoursUsd: bigint | null;
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

// A position whose stock the history does not show closes only its Kamino part, so it has no stock and no leverage to show.
export type CloseView = {
  pool: PoolSymbol;
  stock: CollateralSymbol | null;
  leverage: number | null;
  quote: CloseQuote;
};

// "deposit" is the stock put in the margin account; "supply" is the pool asset put in Kamino.
export type FarmHistoryKind = "deposit" | "borrow" | "supply" | "redeem" | "repay" | "withdraw";

export type FarmHistoryAction = {
  kind: FarmHistoryKind;
  symbol: string;
  amount: TokenAmount;
};

// What one Farm transaction did: opened (or added to) a position, exited Kamino, or returned the stock to the wallet.
export type FarmHistoryEvent = "deploy" | "exit" | "return";

export type FarmHistoryStatus = "succeeded" | "failed";

export type FarmHistoryEntry = {
  id: string;
  event: FarmHistoryEvent;
  // A failed transaction changed nothing: its amounts are what it tried to move, and `reason` says why it failed when the
  // chain's error tells (null otherwise, and always null when it succeeded).
  status: FarmHistoryStatus;
  reason: string | null;
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

// The Positions chart: net earnings (Kamino yield minus Vanna borrow interest) or what is deployed (the stock plus what is in
// Kamino), over a range of time.
export type FarmOverviewMode = "earnings" | "deployed";

export type FarmOverviewRange = "1W" | "1M" | "3M" | "All";

export type FarmChartPoint = { at: number; usd: bigint };

export type FarmChart = {
  value: bigint;
  points: readonly FarmChartPoint[];
  stepMs: number;
  now: number;
};

// What the farms have earned so far, in USD. Kamino earned and interest accrued are the open positions' (the interest is
// what their loans owe beyond what was borrowed); `closedUsd` is what exits already paid out beyond the debt they repaid.
// Net = Kamino earned - interest accrued + closed.
export type FarmEarnings = {
  netUsd: bigint;
  kaminoUsd: bigint;
  interestUsd: bigint;
  closedUsd: bigint;
  // Debt-weighted borrow APY and supply-weighted Kamino APY of the open positions; null when nothing is open.
  borrowApyBps: number | null;
  supplyApyBps: number | null;
};

export type FarmOverview = {
  earnings: FarmEarnings;
  chart: FarmChart;
};
