import { parseUnits } from "@/format/format-amount";
import type { AssetSymbol } from "@/lib/solana/assets";
import { assets } from "@/lib/solana/assets";
import type { OraclePrices } from "@/lib/solana/oracle-prices";
import type { PoolStats } from "@/lib/solana/pools-api";
import type { ValuedDeposit } from "@/lib/portfolio/value-deposits";
import type { EarnMarket, VaultSummary } from "@/types/earn";

import { spendableBalance } from "./spendable-balance";
import { vaultId, vaultMeta } from "./vault-meta";

type Pools = Partial<Record<AssetSymbol, PoolStats>>;

// The pools API reports amounts in whole tokens; the UI works in raw units.
const POOL_RATE_TO_UI_RATE = 1000n;
const decimalsOf = new Map(assets.map((asset) => [asset.symbol, asset.decimals]));

const toRaw = (tokens: number, decimals: number): bigint => parseUnits(Math.max(tokens, 0).toFixed(decimals), decimals) ?? 0n;

const toUsd = (raw: bigint, decimals: number, price: bigint): bigint => (raw * price) / 10n ** BigInt(decimals);

// A vault is listed only when its pool and price are both known; one missing value never shows as zero.
export function buildVaultSummaries(pools: Pools, prices: OraclePrices, deposits: readonly ValuedDeposit[]): VaultSummary[] {
  return assets.flatMap(({ symbol, decimals }) => {
    const pool = pools[symbol];
    const price = prices[symbol];
    if (pool === undefined || price === undefined) return [];
    const deposit = deposits.find((entry) => entry.symbol === symbol);
    const supplied = toRaw(pool.totalSupply, decimals);
    const borrowed = toRaw(pool.totalBorrowed, decimals);
    const available = supplied > borrowed ? supplied - borrowed : 0n;
    return [
      {
        id: vaultId(symbol),
        symbol,
        name: vaultMeta[symbol].name,
        category: vaultMeta[symbol].category,
        supplyApyBps: Math.round(pool.supplyApyPercent * 100),
        totalSupply: { raw: supplied, decimals },
        suppliedUsd: toUsd(supplied, decimals, price),
        borrowedUsd: toUsd(borrowed, decimals, price),
        available: { raw: available, decimals },
        availableUsd: toUsd(available, decimals, price),
        utilizationBps: Math.round(pool.utilizationPercent * 100),
        yourSupply: deposit && deposit.supplied > 0n ? { amount: { raw: deposit.supplied, decimals }, usd: deposit.value } : undefined,
      },
    ];
  });
}

export function buildMarket(id: string, pools: Pools, prices: OraclePrices, walletRaw: bigint, deposit: ValuedDeposit | undefined): EarnMarket | null {
  const asset = assets.find((candidate) => vaultId(candidate.symbol) === id);
  if (!asset) return null;
  const pool = pools[asset.symbol];
  const price = prices[asset.symbol];
  if (pool === undefined || price === undefined) return null;
  return {
    id,
    symbol: asset.symbol,
    shareSymbol: `v${asset.symbol}`,
    decimals: decimalsOf.get(asset.symbol) ?? asset.decimals,
    priceUsd: price,
    supplyApyBps: Math.round(pool.supplyApyPercent * 100),
    shareExchangeRate: pool.exchangeRate / POOL_RATE_TO_UI_RATE,
    walletBalance: { raw: spendableBalance(asset.symbol, walletRaw), decimals: asset.decimals },
    supplied: { raw: deposit?.supplied ?? 0n, decimals: asset.decimals },
  };
}

// Pools the wallet has supplied come first, largest first, so a new supply is not buried under higher-APY pools it has left;
// the rest follow by supply APY.
export function orderVaults(vaults: readonly VaultSummary[]): VaultSummary[] {
  return [...vaults].sort((a, b) => {
    const mine = (b.yourSupply ? 1 : 0) - (a.yourSupply ? 1 : 0);
    if (mine !== 0) return mine;
    if (a.yourSupply && b.yourSupply && a.yourSupply.usd !== b.yourSupply.usd) return a.yourSupply.usd > b.yourSupply.usd ? -1 : 1;
    return b.supplyApyBps - a.supplyApyBps;
  });
}
