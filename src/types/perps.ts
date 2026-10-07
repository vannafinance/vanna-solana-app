export type PerpsSymbol = "TSLAx" | "GOOGLx" | "AAPLx" | "ANTHROPIC" | "OPENAI" | "SKR";

// SKR (Solana Mobile's Seeker token) is a crypto token, not a stock.
export type MarketKind = "xStocks" | "PreStocks" | "Crypto";

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
  // What the stock's pool can still lend, which a short borrows from.
  liquidityUsd: bigint;
  // What the USDC pool can still lend, which a long borrows from.
  usdcLiquidityUsd: bigint;
  maxLeverage: number;
};

// The user's own open position in a market, as the market list shows it: which side and at what leverage.
export type MarketExposure = { side: Side; leverage: number };

export type MarketListItem = PerpsMarket & { watched: boolean; open: MarketExposure | null };

export type Candle = { open: bigint; high: bigint; low: bigint; close: bigint };

export type PerpsPosition = {
  id: string;
  symbol: PerpsSymbol;
  side: Side;
  // Rounded to 0.1x for display.
  leverage: number;
  // Unrounded, for the liquidation estimate, as the web app computes it.
  exactLeverage: number;
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
  // Stocks the account holds or owes outside Farm, raw. A stock both held and owed shows as no position, so the order ticket
  // reads these too, to refuse the opposite side of a position the list cannot show.
  heldStocks?: readonly string[];
  owedStocks?: readonly string[];
  // Stock sitting in the margin account as collateral with no position behind it, in base units: what an order that stopped
  // after its deposit leaves.
  strandedStocks?: Readonly<Record<string, bigint>>;
  historyAvailable: boolean;
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
  // The new loan, in USD units.
  borrow: bigint;
  leverage: number;
};

// "opposite-open": the account already holds the other side of this market, which the web app also refuses until it is closed.
// "pool-liquidity": the loan is more than the pool can lend right now, so the borrow would fail on chain.
// "low-leverage": 1x is only where the slider starts; an order needs 2x or more (a 1x short is a plain sale, a 1x long a
// plain buy, neither a leveraged position).
export type OrderIssue = "stranded-collateral" | "opposite-open" | "low-leverage" | "empty" | "insufficient-margin" | "pool-liquidity" | "health-low" | null;

export type CloseQuote = {
  fractionBps: number;
  tokens: bigint;
  size: bigint;
  pnl: bigint;
  fee: bigint;
  toWallet: bigint;
  // A long sells the stock and sends what is left to the wallet. A short only buys back the stock it owes, so its USDC
  // stays in the margin account, as on the web app.
  returnsTo: "wallet" | "margin";
  liquidationPrice: bigint;
};

export type AddCollateralQuote = {
  amount: bigint;
  collateralAfter: bigint;
  liquidationAfter: bigint;
  availableAfter: bigint;
};

// Where a market's chart comes from: TradingView for listed stocks, a DexScreener pair for tokens with no listing.
export type ChartSource = { kind: "tradingview"; symbol: string } | { kind: "dexscreener"; pairAddress: string };

export type EarningsRange = "1W" | "1M" | "3M" | "All";

// A USD figure (6 decimals) at a time in ms.
export type EarningsPoint = { at: number; usd: bigint };

// The Positions page chart and the figures under it. Net earnings is the price P&L of every closed margin trade plus the
// open P&L of today's positions; borrow interest is not taken out of it and is shown on its own.
export type TradeEarnings = {
  net: bigint;
  points: readonly EarningsPoint[];
  stepMs: number;
  now: number;
  // No margin trade in history and nothing open: there is nothing to chart.
  noTrades: boolean;
  // Some closes in history have no opening in history (it is older than what was read), so they are not counted.
  partial: boolean;
  // Null when the open positions cannot be read.
  openPnl: bigint | null;
  openCount: number | null;
  // Borrow interest owed so far on the open positions; null when a position's borrowed principal is not in history.
  interest: bigint | null;
};
