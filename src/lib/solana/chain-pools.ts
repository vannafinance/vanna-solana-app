import { type Connection, PublicKey } from "@solana/web3.js";

import { type AssetInfo, assets } from "./assets";
import { EXCHANGE_RATE_DECIMALS, fetchPools, type PoolStats } from "./pools-api";
import { reserveAddress, shareMintAddress } from "./program-accounts";
import { ApiError } from "./request-json";
import { decodeShareSupply, decodeVaultReserve, type VaultReserve } from "./vault-accounts";

const toUnits = (raw: bigint, decimals: number) => Number(raw) / 10 ** decimals;

// The web app's two-slope borrow curve (lib/utils/borrow-rate.ts), fed the reserve's own rate model in percent.
function borrowApr(utilizationPercent: number, reserve: VaultReserve): number {
  const base = reserve.baseRateBps / 100;
  const optimal = reserve.optimalBps / 100;
  const slope1 = reserve.slope1Bps / 100;
  const slope2 = reserve.slope2Bps / 100;
  if (!Number.isFinite(utilizationPercent) || utilizationPercent <= 0 || optimal <= 0) return base;
  const utilization = Math.min(100, utilizationPercent);
  if (utilization <= optimal) return base + (utilization / optimal) * slope1;
  return base + slope1 + ((utilization - optimal) / (100 - optimal)) * slope2;
}

// A pool's figures as the web app's /api/pools gives them (lib/pool-stats.ts), from the reserve and share mint on chain.
// Rates are rounded to two decimals at the same steps, so a vault reads the same here and on the website.
export function poolStatsFromChain(reserve: VaultReserve, shareSupply: bigint, decimals: number): PoolStats {
  const liquidity = reserve.accountedLiquidity;
  const borrowed = reserve.totalBorrowAssets;
  const gross = liquidity + borrowed;
  const totalAssets = gross - reserve.accruedFees;
  const utilizationPercent = Number((gross === 0n ? 0 : Number((borrowed * 1_000_000n) / gross) / 10_000).toFixed(2));
  const borrowApyPercent = Number(borrowApr(utilizationPercent, reserve).toFixed(2));
  const scale = 10n ** BigInt(EXCHANGE_RATE_DECIMALS);
  return {
    supplyApyPercent: Number(((borrowApyPercent * utilizationPercent) / 100).toFixed(2)),
    borrowApyPercent,
    totalSupply: toUnits(totalAssets, decimals),
    totalBorrowed: toUnits(borrowed, decimals),
    utilizationPercent,
    // Shares and the underlying use the same decimals, so the rate is a plain ratio; an empty pool is 1:1.
    exchangeRate: totalAssets > 0n && shareSupply > 0n ? (totalAssets * scale) / shareSupply : scale,
  };
}

// The pools of the given assets, read from the chain. An asset whose reserve or share mint is missing is left out.
export async function fetchChainPools(connection: Connection, wanted: readonly AssetInfo[]): Promise<Partial<Record<AssetInfo["symbol"], PoolStats>>> {
  if (wanted.length === 0) return {};
  const keys = wanted.flatMap((asset) => {
    const mint = new PublicKey(asset.mint);
    return [reserveAddress(mint), shareMintAddress(mint)];
  });
  const infos = await connection.getMultipleAccountsInfo(keys, "confirmed").catch(() => {
    throw new ApiError("network");
  });
  const pools: Partial<Record<AssetInfo["symbol"], PoolStats>> = {};
  wanted.forEach((asset, index) => {
    const [reserve, share] = infos.slice(index * 2, index * 2 + 2);
    if (!reserve || !share) return;
    pools[asset.symbol] = poolStatsFromChain(decodeVaultReserve(reserve.data), decodeShareSupply(share.data), asset.decimals);
  });
  return pools;
}

// The app's assets the hosted API does not list (SKR, which the website does not carry).
export function assetsMissingFrom(pools: Partial<Record<AssetInfo["symbol"], unknown>>): AssetInfo[] {
  return assets.filter((asset) => pools[asset.symbol] === undefined);
}

// Every pool the app lists: the hosted API's, plus any it does not serve read from the chain. The website cannot be
// changed for SKR, so its pool comes from the reserve itself; if the API ever lists SKR, its figures are used instead.
export async function fetchAllPools(connection: Connection, signal?: AbortSignal): Promise<Partial<Record<AssetInfo["symbol"], PoolStats>>> {
  const hosted = await fetchPools(signal);
  return { ...(await fetchChainPools(connection, assetsMissingFrom(hosted))), ...hosted };
}
