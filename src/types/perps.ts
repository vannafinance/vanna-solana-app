export type PerpsSymbol = "TSLAx" | "GOOGLx" | "AAPLx" | "ANTHROPIC" | "OPENAI";

export type MarketKind = "xStocks" | "PreStocks";

export type Side = "long" | "short";

export type Timeframe = "1H" | "4H" | "1D" | "1W" | "1M";

export type PerpsMarket = {
  symbol: PerpsSymbol;
  pair: string;
  name: string;
  kind: MarketKind;
  markPrice: bigint;
  tokenBorrowBps: number;
  usdcBorrowBps: number;
  liquidityUsd: bigint;
  maxLeverage: number;
};

export type MarketListItem = PerpsMarket & { watched: boolean };

export type Candle = { open: bigint; high: bigint; low: bigint; close: bigint };

export type PerpsPosition = {
  id: string;
  symbol: PerpsSymbol;
  side: Side;
  leverage: number;
  openedOn: string;
  entryPrice: bigint;
  tokens: bigint;
  collateral: bigint;
};

export type PositionSummary = PerpsPosition & {
  pair: string;
  markPrice: bigint;
  sizeUsd: bigint;
  pnl: bigint;
  pnlBps: number;
  liquidationPrice: bigint;
  liquidationDistanceBps: number;
};

export type ClosedPosition = {
  id: string;
  symbol: PerpsSymbol;
  side: Side;
  leverage: number;
  openedOn: string;
  heldFor: string;
  entryPrice: bigint;
  exitPrice: bigint;
  tokens: bigint;
  collateral: bigint;
  fees: bigint;
};

export type ClosedSummary = ClosedPosition & { pair: string; pnl: bigint; pnlBps: number };

export type PerpsAccount = {
  margin: bigint;
  available: bigint;
  borrowed: bigint;
  health: number;
};

export type PerpsPortfolio = {
  account: PerpsAccount;
  positionsAvailable: boolean;
  positions: PositionSummary[];
  openPnl: bigint;
  closed: ClosedSummary[];
  realizedPnl: bigint;
  winRateBps: number;
};

export type OrderQuote = {
  size: bigint;
  tokens: bigint;
  liquidationPrice: bigint;
  fee: bigint;
  healthAfter: number;
};

export type OrderIssue = "empty" | "insufficient-margin" | "health-low" | null;

export type CloseQuote = {
  fractionBps: number;
  tokens: bigint;
  size: bigint;
  pnl: bigint;
  fee: bigint;
  toMargin: bigint;
  liquidationPrice: bigint;
};

export type AddCollateralQuote = {
  amount: bigint;
  collateralAfter: bigint;
  liquidationAfter: bigint;
  availableAfter: bigint;
};
