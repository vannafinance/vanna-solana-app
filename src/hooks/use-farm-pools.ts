import { farmPoolRows } from "@/lib/farm/pool-rows";
import { toPositionView } from "@/lib/farm/position-math";
import { assets } from "@/lib/solana/assets";
import { YIELD_SYMBOLS } from "@/lib/solana/kamino";
import type { FarmPool, FarmPoolRow } from "@/types/farm";
import type { Resource } from "@/types/resource";

import { useFarmState } from "./use-farm-state";
import { useKaminoStats } from "./use-kamino-stats";
import { useOraclePrices } from "./use-oracle-prices";
import { usePools } from "./use-pools";

const MARKET = "Kamino Main Market";

// Interest accrues between the read and the transaction, so a little of the free liquidity is kept back.
const LIQUIDITY_MARGIN = 0.99;

function borrowableOf(totalSupply: number, totalBorrowed: number, decimals: number): bigint {
  return BigInt(Math.max(0, Math.floor((totalSupply - totalBorrowed) * LIQUIDITY_MARGIN * 10 ** decimals)));
}

// The Kamino pools a stock can be farmed into. Everything is a live read: the pool's rates and size from Kamino, what Vanna
// charges to borrow and has free to lend, and the oracle price that values it. A pool with any figure missing is left out.
export function useFarmPoolSources() {
  const prices = useOraclePrices();
  const stats = useKaminoStats();
  const vanna = usePools();

  const pools: FarmPool[] = YIELD_SYMBOLS.flatMap((symbol) => {
    const price = prices.data?.[symbol];
    const kamino = stats.data?.[symbol];
    const reserve = vanna.data?.[symbol];
    const decimals = assets.find((asset) => asset.symbol === symbol)?.decimals;
    if (price === undefined || !kamino || reserve === undefined || decimals === undefined) return [];
    return [
      {
        symbol,
        market: MARKET,
        decimals,
        priceUsd: price,
        supplyApyBps: kamino.supplyApyBps,
        borrowApyBps: Math.round(reserve.borrowApyPercent * 100),
        available: kamino.available,
        borrowable: borrowableOf(reserve.totalSupply, reserve.totalBorrowed, decimals),
        totalSupplied: kamino.totalSupplied,
        utilizationBps: kamino.utilizationBps,
      },
    ];
  });

  const failed = [prices, stats, vanna].find((query) => query.isError && query.data === undefined);
  return {
    pools,
    settled: prices.data !== undefined && stats.data !== undefined && vanna.data !== undefined,
    error: failed?.error ?? null,
    retry: () => {
      void prices.refetch();
      void stats.refetch();
      void vanna.refetch();
    },
  };
}

// The Pools page: each pool with what the user already holds in it. Positions are optional; the pools show without a wallet.
export function useFarmPools(): Resource<FarmPoolRow[]> {
  const sources = useFarmPoolSources();
  const state = useFarmState();
  const positions = state.status === "ready" ? state.data.positions.map(toPositionView) : [];

  if (sources.pools.length > 0) return { status: "ready", data: farmPoolRows(sources.pools, positions) };
  if (sources.error) return { status: "error", error: sources.error, retry: sources.retry };
  return sources.settled ? { status: "empty" } : { status: "loading" };
}
