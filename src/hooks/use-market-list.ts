import { useCallback } from "react";

import { useOraclePrices } from "@/hooks/use-oracle-prices";
import { usePools } from "@/hooks/use-pools";
import { buildMarkets } from "@/lib/perps/build-markets";
import type { PerpsMarket } from "@/types/perps";
import type { Resource } from "@/types/resource";

// Live markets: oracle price, pool borrow rates and free pool liquidity.
export function useMarketList(): Resource<PerpsMarket[]> {
  const pools = usePools();
  const prices = useOraclePrices();
  const { refetch: refetchPools } = pools;
  const { refetch: refetchPrices } = prices;
  const retry = useCallback(() => {
    void refetchPools();
    void refetchPrices();
  }, [refetchPools, refetchPrices]);

  const failed = [pools, prices].find((query) => query.data === undefined && query.isError);
  if (failed) return { status: "error", error: failed.error as Error, retry };
  if (pools.data === undefined || prices.data === undefined) return { status: "loading" };
  const markets = buildMarkets(pools.data, prices.data);
  return markets.length === 0 ? { status: "empty" } : { status: "ready", data: markets, stale: pools.isError || prices.isError, refresh: retry };
}
