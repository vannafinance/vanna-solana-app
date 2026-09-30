// Placeholder data mirroring devnet values in design/; replaced by RPC reads.
import { type TokenAmount, parseUnits } from "@/format/format-amount";
import { capUsageBps } from "@/lib/earn/cap-usage";
import type {
  EarnAsset,
  EarnHistoryGroup,
  EarnMarket,
  OverviewMode,
  OverviewRange,
  RateCurve,
  VaultCategory,
  VaultCollateralAsset,
  VaultDetail,
  VaultEventKind,
  VaultPosition,
} from "@/types/earn";

const USD_DECIMALS = 6;

function raw(text: string, decimals: number): bigint {
  const parsed = parseUnits(text, decimals);
  if (parsed === null) throw new Error(`Invalid preview amount: ${text}`);
  return parsed;
}

function amount(text: string, decimals: number): TokenAmount {
  return { raw: raw(text, decimals), decimals };
}

function tokensFromUsd(usd: bigint, decimals: number, priceUsd: bigint): TokenAmount {
  return { raw: (usd * 10n ** BigInt(decimals)) / priceUsd, decimals };
}

type VaultSpec = {
  symbol: EarnAsset;
  name: string;
  shareSymbol: string;
  category: VaultCategory;
  decimals: number;
  price: string;
  supplyApyBps: number;
  borrowApyBps: number;
  utilizationBps: number;
  suppliedUsd: string;
  borrowedUsd: string;
  liquidationBonusBps: number;
  exchangeRate: bigint;
  position?: VaultPosition;
};

const BASE_RATE_BPS = 20;
const KINK_UTILIZATION_BPS = 8000;
const CAP_USD = { supply: "999900", borrow: "499950" };
const USDC_SUPPLIED_TOKENS = 55_012;

function rateCurveThrough(utilizationBps: number, borrowApyBps: number): RateCurve {
  const kinkRateBps = Math.round(BASE_RATE_BPS + ((borrowApyBps - BASE_RATE_BPS) * KINK_UTILIZATION_BPS) / utilizationBps);
  return { baseBps: BASE_RATE_BPS, kinkUtilizationBps: KINK_UTILIZATION_BPS, kinkRateBps, maxRateBps: kinkRateBps * 4 };
}

function activityFor(supplied: TokenAmount): VaultDetail["activity"] {
  const entries: readonly { kind: VaultEventKind; tokens: bigint; when: string }[] = [
    { kind: "supply", tokens: 12_000n, when: "2h ago" },
    { kind: "borrow", tokens: 3_400n, when: "5h ago" },
    { kind: "repay", tokens: 1_100n, when: "Yesterday" },
    { kind: "withdraw", tokens: 4_000n, when: "Sep 27" },
  ];
  return entries.map(({ kind, tokens, when }) => ({
    kind,
    when,
    amount: { raw: (supplied.raw * tokens) / BigInt(USDC_SUPPLIED_TOKENS), decimals: supplied.decimals },
  }));
}

const collateralAssets: readonly VaultCollateralAsset[] = [
  { symbol: "USDC", collateral: true, borrow: true, liquidationBonusBps: 500 },
  { symbol: "SOL", collateral: true, borrow: true, liquidationBonusBps: 500 },
  { symbol: "TSLAx", collateral: true, borrow: true, liquidationBonusBps: 750 },
  { symbol: "GOOGLx", collateral: true, borrow: true, liquidationBonusBps: 750 },
  { symbol: "ANTHROPIC", collateral: true, borrow: true, liquidationBonusBps: 1000 },
];

function buildVault(spec: VaultSpec): VaultDetail {
  const price = raw(spec.price, USD_DECIMALS);
  const suppliedUsd = raw(spec.suppliedUsd, USD_DECIMALS);
  const borrowedUsd = raw(spec.borrowedUsd, USD_DECIMALS);
  const supplied = tokensFromUsd(suppliedUsd, spec.decimals, price);
  const borrowed = tokensFromUsd(borrowedUsd, spec.decimals, price);
  const topSuppliers = { raw: (supplied.raw * 712n) / 1000n, decimals: spec.decimals };
  const supplyCap = tokensFromUsd(raw(CAP_USD.supply, USD_DECIMALS), spec.decimals, price);
  const borrowCap = tokensFromUsd(raw(CAP_USD.borrow, USD_DECIMALS), spec.decimals, price);

  return {
    id: spec.symbol.toLowerCase(),
    symbol: spec.symbol,
    category: spec.category,
    supplyApyBps: spec.supplyApyBps,
    suppliedUsd,
    borrowedUsd,
    yourSupply: spec.position?.supplied,
    name: spec.name,
    shareSymbol: spec.shareSymbol,
    decimals: spec.decimals,
    priceUsd: price,
    utilizationBps: spec.utilizationBps,
    borrowApyBps: spec.borrowApyBps,
    supplied,
    borrowed,
    availableLiquidity: { raw: supplied.raw - borrowed.raw, decimals: spec.decimals },
    liquidationBonusBps: spec.liquidationBonusBps,
    liquidationHealthFactor: "1.10",
    oracleSource: "Pyth",
    oracleMaxAgeSeconds: 60,
    shareExchangeRate: spec.exchangeRate,
    reserveFactorBps: 1000,
    supplyCap,
    borrowCap,
    supplyCapUsageBps: capUsageBps(supplied.raw, supplyCap.raw),
    borrowCapUsageBps: capUsageBps(borrowed.raw, borrowCap.raw),
    contracts: [
      { label: `${spec.shareSymbol} share mint`, address: "vUSD…p2Qa" },
      { label: `${spec.symbol} reserve`, address: "Rsv8…3kLm" },
      { label: "Liquidity vault", address: "LqV1…9sPe" },
      { label: "Asset config", address: "Cfg4…mT7x" },
      { label: `${spec.symbol} mint`, address: "EPjF…Dt1v" },
      { label: "Vanna lending program", address: "BZ81…H3Zg" },
    ],
    topSuppliers,
    topSuppliersShareBps: 7120,
    otherSuppliers: { raw: supplied.raw - topSuppliers.raw, decimals: spec.decimals },
    activity: activityFor(supplied),
    collateralAssets,
    rateCurve: rateCurveThrough(spec.utilizationBps, spec.borrowApyBps),
    managers: [
      { label: "Vault manager", value: "Vanna Labs" },
      { label: "Risk curator", value: "Vanna risk council" },
      { label: "Interest model", value: `Kinked, ${KINK_UTILIZATION_BPS / 100}% target` },
      { label: "Oracle", value: "Pyth, Scope fallback" },
    ],
    position: spec.position,
  };
}

const usdcPosition: VaultPosition = {
  supplied: amount("2500", 6),
  shares: amount("2499.81", 6),
  valueUsd: raw("2499.75", USD_DECIMALS),
  earnedUsd: raw("0.81", USD_DECIMALS),
  earned: amount("0.81", 6),
  events: [
    { kind: "withdraw", amount: amount("500", 6), date: "Sep 25", signature: "4hGk…9Qp2" },
    { kind: "supply", amount: amount("3000", 6), date: "Sep 20", signature: "2xLm…c81A" },
  ],
};

const solPosition: VaultPosition = {
  supplied: amount("1.5", 9),
  shares: amount("1.49991", 9),
  valueUsd: raw("178.12", USD_DECIMALS),
  earnedUsd: raw("0.56", USD_DECIMALS),
  earned: amount("0.00472", 9),
  events: [{ kind: "supply", amount: amount("1.5", 9), date: "Sep 22", signature: "9pRt…k4Vd" }],
};

export const previewVaults: readonly VaultDetail[] = [
  buildVault({ symbol: "TSLAx", name: "Tesla xStock", shareSymbol: "vTSLAx", category: "xStocks", decimals: 8, price: "353.59", supplyApyBps: 182, borrowApyBps: 528, utilizationBps: 3830, suppliedUsd: "38900", borrowedUsd: "14900", liquidationBonusBps: 750, exchangeRate: 1_000_310n }),
  buildVault({ symbol: "GOOGLx", name: "Alphabet xStock", shareSymbol: "vGOOGLx", category: "xStocks", decimals: 8, price: "178.12", supplyApyBps: 13, borrowApyBps: 144, utilizationBps: 1000, suppliedUsd: "68000", borrowedUsd: "6800", liquidationBonusBps: 750, exchangeRate: 1_000_041n }),
  buildVault({ symbol: "SOL", name: "Solana", shareSymbol: "vSOL", category: "Crypto", decimals: 9, price: "118.75", supplyApyBps: 11, borrowApyBps: 132, utilizationBps: 924, suppliedUsd: "36800", borrowedUsd: "3400", liquidationBonusBps: 500, exchangeRate: 1_000_062n, position: solPosition }),
  buildVault({ symbol: "USDC", name: "USD Coin", shareSymbol: "vUSDC", category: "Stablecoins", decimals: 6, price: "0.9999", supplyApyBps: 3, borrowApyBps: 65, utilizationBps: 520, suppliedUsd: "55006.50", borrowedUsd: "2799.72", liquidationBonusBps: 500, exchangeRate: 1_000_024n, position: usdcPosition }),
  buildVault({ symbol: "OPENAI", name: "OpenAI PreStock", shareSymbol: "vOPENAI", category: "PreStocks", decimals: 6, price: "1250", supplyApyBps: 3, borrowApyBps: 70, utilizationBps: 476, suppliedUsd: "267000", borrowedUsd: "12700", liquidationBonusBps: 1000, exchangeRate: 1_000_018n }),
  buildVault({ symbol: "ANTHROPIC", name: "Anthropic PreStock", shareSymbol: "vANTHROPIC", category: "PreStocks", decimals: 6, price: "1042.77", supplyApyBps: 1, borrowApyBps: 35, utilizationBps: 320, suppliedUsd: "131400", borrowedUsd: "4200", liquidationBonusBps: 1000, exchangeRate: 1_000_007n }),
  buildVault({ symbol: "AAPLx", name: "Apple xStock", shareSymbol: "vAAPLx", category: "xStocks", decimals: 8, price: "226.40", supplyApyBps: 1, borrowApyBps: 40, utilizationBps: 280, suppliedUsd: "46500", borrowedUsd: "1300", liquidationBonusBps: 750, exchangeRate: 1_000_009n }),
];

export const previewWalletBalances: Record<EarnAsset, TokenAmount> = {
  USDC: amount("3120.40", 6),
  SOL: amount("2.10", 9),
  TSLAx: amount("1.25", 8),
  ANTHROPIC: amount("0.96", 6),
  GOOGLx: amount("0", 8),
  OPENAI: amount("0", 6),
  AAPLx: amount("0", 8),
};

export const previewWalletUsd = raw("4812.40", USD_DECIMALS);

export const previewVaultCategories: readonly VaultCategory[] = ["xStocks", "PreStocks", "Crypto", "Stablecoins"];

const zeros = (count: number) => Array.from({ length: count }, () => 0);

export const previewOverviewShapes: Record<OverviewMode, Record<OverviewRange, { levels: readonly number[]; endLevel: number }>> = {
  deposit: {
    "1W": { levels: [52, 80, 80, 80, 67, 67, 67, 67], endLevel: 67 },
    "1M": { levels: [...zeros(6), 76, 80, 80, 67, 67, 67], endLevel: 67 },
    "3M": { levels: [...zeros(20), 76, 80, 67, 67], endLevel: 67 },
    All: { levels: [...zeros(28), 76, 80, 67, 67], endLevel: 67 },
  },
  earnings: {
    "1W": { levels: [0, 11, 22, 34, 45, 57, 69, 80], endLevel: 80 },
    "1M": { levels: [...zeros(6), 3, 18, 35, 53, 67, 80], endLevel: 80 },
    "3M": { levels: [...zeros(20), 3, 35, 64, 80], endLevel: 80 },
    All: { levels: [...zeros(28), 3, 35, 64, 80], endLevel: 80 },
  },
};

export const previewHistory: readonly EarnHistoryGroup[] = [
  { label: "Today", entries: [{ id: "h1", kind: "interest", asset: "USDC", usd: raw("0.12", USD_DECIMALS), when: "9h ago" }] },
  { label: "Sep 25", entries: [{ id: "h2", kind: "withdraw", asset: "USDC", amount: amount("500", 6), usd: raw("499.95", USD_DECIMALS) }] },
  { label: "Sep 22", entries: [{ id: "h3", kind: "supply", asset: "SOL", amount: amount("1.5", 9), usd: raw("177.87", USD_DECIMALS) }] },
  {
    label: "Sep 20",
    entries: [
      { id: "h4", kind: "supply", asset: "USDC", amount: amount("3000", 6), usd: raw("2999.70", USD_DECIMALS) },
      { id: "h5", kind: "shares", asset: "USDC", shares: amount("3000", 6) },
    ],
  },
];

export function previewMarket(id: string): EarnMarket | undefined {
  const vault = previewVaults.find((candidate) => candidate.id === id);
  if (!vault) return undefined;
  return {
    id: vault.id,
    symbol: vault.symbol,
    shareSymbol: vault.shareSymbol,
    decimals: vault.decimals,
    priceUsd: vault.priceUsd,
    supplyApyBps: vault.supplyApyBps,
    shareExchangeRate: vault.shareExchangeRate,
    walletBalance: previewWalletBalances[vault.symbol],
    supplied: vault.position?.supplied ?? { raw: 0n, decimals: vault.decimals },
  };
}
