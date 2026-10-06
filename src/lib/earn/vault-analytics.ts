import { assets, type AssetSymbol } from "@/lib/solana/assets";
import type { PoolStats } from "@/lib/solana/pools-api";
import type { VaultReserve } from "@/lib/solana/vault-accounts";
import type { VaultAnalytics } from "@/types/earn";

import { type RateModel, rateAt, sampleCurve } from "./rate-model";
import { vaultId } from "./vault-meta";

const BPS = 10_000;

// The curve is the reserve's own rate model, so it is drawn from its real parameters; the point on it is today's usage.
export function buildVaultAnalytics(id: string, pools: Partial<Record<AssetSymbol, PoolStats>>, reserves: Partial<Record<AssetSymbol, VaultReserve>>): VaultAnalytics | null {
  const symbol = assets.find((asset) => vaultId(asset.symbol) === id)?.symbol;
  const pool = symbol === undefined ? undefined : pools[symbol];
  const reserve = symbol === undefined ? undefined : reserves[symbol];
  if (!pool || !reserve) return null;

  const model: RateModel = { base: reserve.baseRateBps / BPS, slope1: reserve.slope1Bps / BPS, slope2: reserve.slope2Bps / BPS, kink: reserve.optimalBps / BPS, reserveFactor: reserve.reserveFactorBps / BPS };
  return {
    supplyApyBps: Math.round(pool.supplyApyPercent * 100),
    borrowApyBps: Math.round(pool.borrowApyPercent * 100),
    curve: { samples: sampleCurve(model), kink: rateAt(model, model.kink), current: rateAt(model, pool.utilizationPercent / 100) },
  };
}
