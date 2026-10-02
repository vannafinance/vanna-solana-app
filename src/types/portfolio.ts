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

export type ClosedPosition = {
  id: string;
  symbol: AssetSymbol;
  pair: string;
  kind: "perp" | "farm";
  side?: PositionSide;
  leverage: number;
  closedOn: string;
  duration: string;
  pnl: bigint;
  pnlBps: number;
  entryPrice?: bigint;
  exitPrice?: bigint;
  sizeTokens: TokenAmount;
  collateral: bigint;
  fees: bigint;
  farm?: { borrowed: bigint; deployedTo: string; netAprBps: number };
};

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

export type Portfolio = {
  walletBalance: bigint | null;
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

export type TraderSummary = {
  positionsAvailable: boolean;
  historyAvailable: boolean;
  perpPnl: bigint | null;
  farmPnl: bigint | null;
  margin: bigint;
  available: bigint;
  borrowed: bigint;
  health: number | null;
  current: Position[];
  history: ClosedPosition[];
  realizedPnl: bigint | null;
  winRateBps: number;
  explorerUrl: string;
};

export type LenderSummary = {
  portfolio: bigint;
  totalHoldings: bigint | null;
  avgSupplyApyBps: number | null;
  vaults: LenderVault[];
  spot: TokenBalance[] | null;
  history: LenderActivityGroup[] | null;
};
