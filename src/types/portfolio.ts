import type { TokenAmount } from "@/format/format-amount";

export type AssetSymbol = "TSLAx" | "GOOGLx" | "AAPLx" | "ANTHROPIC" | "OPENAI" | "SOL" | "USDC";

export type PositionSide = "long" | "short";

type PositionBase = {
  id: string;
  symbol: AssetSymbol;
  pair: string;
  leverage: number;
  openedOn: string;
  pnl: bigint;
  pnlBps: number;
  size: bigint;
  sizeTokens: TokenAmount;
  collateral: bigint;
};

export type PerpPosition = PositionBase & {
  kind: "perp";
  side: PositionSide;
  liquidationPrice: bigint;
  liquidationAwayBps: number;
  entryPrice: bigint;
  markPrice: bigint;
};

export type FarmPosition = PositionBase & {
  kind: "farm";
  // The pool asset borrowed and supplied to Kamino.
  pool: string;
  health: number;
  borrowed: bigint;
  netAprBps: number;
  venue: string;
  liquidationPrice: bigint;
  liquidationAwayBps: number;
};

export type Position = PerpPosition | FarmPosition;

export type TokenBalance = {
  symbol: AssetSymbol;
  tokens: TokenAmount;
  value: bigint;
  changeTodayBps?: number;
};

export type LenderVault = {
  id: string;
  symbol: AssetSymbol;
  name: string;
  value: bigint;
  supplied: TokenAmount;
  supplyApyBps: number;
  earned: bigint | null;
};

export type LenderActivity = {
  id: string;
  signature?: string;
  kind: "interest" | "supply" | "withdraw" | "shares";
  title: string;
  detail: string;
  valueUsd?: bigint;
  valueLabel?: string;
  gain?: boolean;
};

export type LenderActivityGroup = {
  label: string;
  items: LenderActivity[];
};

// A part of net worth that can fail to load on its own. The margin account is the primary source and never missing.
export type NetWorthPart = "wallet" | "earn";

export type Portfolio = {
  walletBalance: bigint | null;
  // What is supplied to Earn vaults, at today's prices. Null when the deposits cannot be read.
  earnSupplied: bigint | null;
  // Wallet + Earn supplied + the margin account's net value. Parts that cannot be read are left out and listed in `netWorthMissing`.
  netWorth: bigint;
  netWorthMissing: NetWorthPart[];
  // Open Perps P&L plus Farm P&L; null when either side's positions cannot be read.
  tradingPnl: bigint | null;
  marginBalance: bigint;
  totalBorrowed: bigint;
  netAvailable: bigint;
  netEarnings: bigint | null;
  health: number | null;
  leverage: number | null;
  roomBeforeLiquidation: bigint;
  hasMarginAccount: boolean;
  walletAddress: string;
  marginAddress: string | null;
  positions: Position[] | null;
  assets: TokenBalance[] | null;
};

// The open Perps and Farm positions. The account-level figures come from `useMarginOverview`.
export type TraderSummary = {
  positionsAvailable: boolean;
  current: Position[];
};

// Lending only: what is supplied to Earn vaults. Wallet balances are not part of it.
export type LenderSummary = {
  supplied: bigint;
  avgSupplyApyBps: number | null;
  // Interest earned across the vaults; null when the history cannot be read.
  earned: bigint | null;
  vaults: LenderVault[];
  history: LenderActivityGroup[] | null;
};
