import type { TokenAmount } from "@/format/format-amount";

export type EarnAsset = "TSLAx" | "GOOGLx" | "AAPLx" | "ANTHROPIC" | "OPENAI" | "SKR" | "SOL" | "USDC";

export type VaultCategory = "xStocks" | "PreStocks" | "Crypto" | "Stablecoins";

export type VaultSummary = {
  id: string;
  symbol: EarnAsset;
  name: string;
  category: VaultCategory;
  supplyApyBps: number;
  // Pool totals, in the vault's own token and in dollars at the oracle price.
  totalSupply: TokenAmount;
  suppliedUsd: bigint;
  borrowedUsd: bigint;
  // Supplied less borrowed: what is left in the pool to withdraw or borrow.
  available: TokenAmount;
  availableUsd: bigint;
  utilizationBps: number;
  // Only when the connected wallet has something in this vault.
  yourSupply?: { amount: TokenAmount; usd: bigint };
};

export type OverviewMode = "deposit" | "earnings";

export type OverviewRange = "1W" | "1M" | "3M" | "All";

export type UsdPoint = { at: number; usd: bigint };

export type EarnOverview = {
  value: bigint;
  points: readonly UsdPoint[];
  stepMs: number;
  now: number;
};

export type PoolFilterOption = {
  value: "all" | VaultCategory;
  count: number;
};

export type VaultCollateralAsset = {
  symbol: EarnAsset;
  collateral: boolean;
  borrow: boolean;
  liquidationBonusBps: number;
};

export type VaultContract = { label: string; address: string };

export type RateSample = { utilization: number; borrow: number; lender: number };

// The rates are read from the reserve today. Nothing records a history of them, so none is shown.
export type VaultAnalytics = {
  supplyApyBps: number;
  borrowApyBps: number;
  curve: { samples: readonly RateSample[]; kink: RateSample; current: RateSample };
};

// A supply or withdrawal the connected wallet made in this vault. A withdrawal's size is unknown when the transaction
// does not show it.
export type VaultPositionEvent = {
  kind: "supply" | "withdraw";
  amount: TokenAmount | null;
  date: string;
  signature: string;
};

export type VaultPosition = {
  supplied: TokenAmount;
  shares: TokenAmount;
  valueUsd: bigint;
  // Interest earned in the vault's own token; null when the history does not show what was supplied.
  earned: TokenAmount | null;
};

export type VaultLimit = { label: string; value: string };

export type VaultDetail = VaultSummary & {
  name: string;
  shareSymbol: string;
  decimals: number;
  priceUsd: bigint;
  utilizationBps: number;
  borrowApyBps: number;
  supplied: TokenAmount;
  borrowed: TokenAmount;
  availableLiquidity: TokenAmount;
  liquidationBonusBps: number;
  liquidationHealthFactor: string;
  oracleSource: string;
  oracleMaxAgeSeconds: number;
  shareExchangeRate: bigint;
  reserveFactorBps: number;
  // A cap of zero on the reserve means there is none.
  supplyCap: TokenAmount | null;
  borrowCap: TokenAmount | null;
  supplyCapUsageBps: number | null;
  borrowCapUsageBps: number | null;
  contracts: readonly VaultContract[];
  limits: readonly VaultLimit[];
  collateralAssets: readonly VaultCollateralAsset[];
  activity: readonly VaultPositionEvent[];
  position?: VaultPosition;
};

export type EarnPosition = {
  vaultId: string;
  symbol: EarnAsset;
  supplied: TokenAmount;
  valueUsd: bigint;
  supplyApyBps: number;
  earnedUsd: bigint | null;
};

export type EarnPortfolioSummary = {
  suppliedUsd: bigint;
  totalHoldingsUsd: bigint | null;
  assetCount: number;
  averageSupplyApyBps: number;
};

export type EarnHistoryEntry =
  | { id: string; kind: "interest"; asset: EarnAsset; usd: bigint; when: string }
  | { id: string; kind: "supply" | "withdraw"; asset: EarnAsset; amount: TokenAmount | null; usd: bigint | null; signature?: string }
  | { id: string; kind: "shares"; asset: EarnAsset; shares: TokenAmount };

export type EarnHistoryGroup = {
  label: string;
  entries: readonly EarnHistoryEntry[];
};

export type EarnMarket = {
  id: string;
  symbol: EarnAsset;
  shareSymbol: string;
  decimals: number;
  priceUsd: bigint;
  supplyApyBps: number;
  shareExchangeRate: bigint;
  walletBalance: TokenAmount;
  supplied: TokenAmount;
};

export type AmountProblem = "empty" | "insufficient";

export type EarnPortfolio = {
  summary: EarnPortfolioSummary;
  positions: readonly EarnPosition[];
  earnedUsd: bigint | null;
};

export type AmountQuote = {
  shares: bigint;
  suppliedAfter: bigint;
  projectedYearlyUsd: bigint;
};
