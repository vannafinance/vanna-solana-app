import type { TokenAmount } from "@/format/format-amount";

export type EarnAsset = "TSLAx" | "GOOGLx" | "AAPLx" | "ANTHROPIC" | "OPENAI" | "SOL" | "USDC";

export type VaultCategory = "xStocks" | "PreStocks" | "Crypto" | "Stablecoins";

export type VaultSummary = {
  id: string;
  symbol: EarnAsset;
  category: VaultCategory;
  supplyApyBps: number;
  suppliedUsd: bigint;
  borrowedUsd: bigint;
  yourSupply?: TokenAmount;
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

export type VaultEventKind = "supply" | "borrow" | "repay" | "withdraw";

export type VaultActivityEntry = {
  kind: VaultEventKind;
  amount: TokenAmount;
  when: string;
};

export type VaultCollateralAsset = {
  symbol: EarnAsset;
  collateral: boolean;
  borrow: boolean;
  liquidationBonusBps: number;
};

export type VaultContract = { label: string; address: string };

export type ApyRange = "7D" | "30D" | "90D";

export type ApyPoint = { at: number; apyPercent: number };

export type ApyHistory = { stepMs: number; points: readonly ApyPoint[] };

export type RateSample = { utilization: number; borrow: number; lender: number };

export type VaultAnalytics = {
  now: number;
  apy: Record<ApyRange, ApyHistory>;
  curve: { samples: readonly RateSample[]; kink: RateSample; current: RateSample };
};

export type VaultPositionEvent = {
  kind: "supply" | "withdraw";
  amount: TokenAmount;
  date: string;
  signature: string;
};

export type VaultPosition = {
  supplied: TokenAmount;
  shares: TokenAmount;
  valueUsd: bigint;
  earnedUsd: bigint;
  earned: TokenAmount;
  events: readonly VaultPositionEvent[];
};

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
  supplyCap: TokenAmount;
  borrowCap: TokenAmount;
  contracts: readonly VaultContract[];
  supplyCapUsageBps: number;
  borrowCapUsageBps: number;
  topSuppliers: TokenAmount;
  topSuppliersShareBps: number;
  otherSuppliers: TokenAmount;
  activity: readonly VaultActivityEntry[];
  collateralAssets: readonly VaultCollateralAsset[];
  managers: readonly { label: string; value: string }[];
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
  | { id: string; kind: "supply" | "withdraw"; asset: EarnAsset; amount: TokenAmount | null; usd: bigint | null }
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
