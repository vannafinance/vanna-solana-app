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
  changeTodayBps: number;
};

export type LenderVault = {
  id: string;
  symbol: "USDC" | "SOL";
  name: string;
  value: bigint;
  supplied: TokenAmount;
  supplyApyBps: number;
  earned: bigint;
};

export type LenderActivity = {
  id: string;
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
  walletBalance: bigint;
  marginBalance: bigint;
  totalBorrowed: bigint;
  netAvailable: bigint;
  netEarnings: bigint;
  health: number | null;
  leverage: number | null;
  roomBeforeLiquidation: bigint;
  walletAddress: string;
  marginAddress: string;
  positions: Position[];
  assets: TokenBalance[];
};

export type TraderSummary = {
  perpPnl: bigint;
  farmPnl: bigint;
  margin: bigint;
  available: bigint;
  borrowed: bigint;
  health: number | null;
  current: Position[];
  history: ClosedPosition[];
  realizedPnl: bigint;
  winRateBps: number;
  explorerUrl: string;
};

export type LenderSummary = {
  portfolio: bigint;
  totalHoldings: bigint;
  avgSupplyApyBps: number;
  vaults: LenderVault[];
  spot: TokenBalance[];
  history: LenderActivityGroup[];
};
