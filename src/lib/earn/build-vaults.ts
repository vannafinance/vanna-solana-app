import { parseUnits } from "@/format/format-amount";
import type { AssetSymbol } from "@/lib/solana/assets";
import { assets } from "@/lib/solana/assets";
import type { OraclePrices } from "@/lib/solana/oracle-prices";
import type { PoolStats } from "@/lib/solana/pools-api";
import type { ValuedDeposit } from "@/lib/portfolio/value-deposits";
import type { EarnMarket, VaultSummary } from "@/types/earn";

import { vaultId, vaultMeta } from "./vault-meta";

type Pools = Partial<Record<AssetSymbol, PoolStats>>;

// The pools API reports amounts in whole tokens; the UI works in raw units.
const POOL_RATE_TO_UI_RATE = 1000n;
const decimalsOf = new Map(assets.map((asset) => [asset.symbol, asset.decimals]));

const toUsd = (tokens: number, decimals: number, price: bigint): bigint => {
  const raw = parseUnits(tokens.toFixed(decimals), decimals);
  return raw === null ? 0n : (raw * price) / 10n ** BigInt(decimals);
};

// A vault is listed only when its pool and price are both known; one missing value never shows as zero.
export function buildVaultSummaries(pools: Pools, prices: OraclePrices, deposits: readonly ValuedDeposit[]): VaultSummary[] {
  return assets.flatMap(({ symbol, decimals }) => {
    const pool = pools[symbol];
    const price = prices[symbol];
    if (pool === undefined || price === undefined) return [];
    const deposit = deposits.find((entry) => entry.symbol === symbol);
    return [
      {
        id: vaultId(symbol),
        symbol,
        category: vaultMeta[symbol].category,
        supplyApyBps: Math.round(pool.supplyApyPercent * 100),
        suppliedUsd: toUsd(pool.totalSupply, decimals, price),
        borrowedUsd: toUsd(pool.totalBorrowed, decimals, price),
        yourSupply: deposit ? { raw: deposit.supplied, decimals } : undefined,
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
    walletBalance: { raw: walletRaw, decimals: asset.decimals },
    supplied: { raw: deposit?.supplied ?? 0n, decimals: asset.decimals },
  };
}
