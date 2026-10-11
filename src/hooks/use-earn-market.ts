import { useCallback } from "react";

import { useEarnDeposits } from "@/hooks/use-earn-deposits";
import { useOraclePrices } from "@/hooks/use-oracle-prices";
import { usePools } from "@/hooks/use-pools";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useWalletHoldings } from "@/hooks/use-wallet-holdings";
import { buildMarket } from "@/lib/earn/build-vaults";
import type { EarnMarket } from "@/types/earn";
import type { Resource } from "@/types/resource";

// The supply and withdraw forms need all four reads: a missing wallet balance or deposit would let a user
// type against a limit that is wrong, so any failure is an error here, never a zero.
export function useEarnMarket(id: string): Resource<EarnMarket> {
  const wallet = useWalletAddress();
  const pools = usePools();
  const prices = useOraclePrices();
  const deposits = useEarnDeposits(wallet);
  const holdings = useWalletHoldings(wallet);
  const { refetch: refetchPools } = pools;
  const { refetch: refetchPrices } = prices;
  const { refetch: refetchDeposits } = deposits;
  const { refetch: refetchHoldings } = holdings;
  const retry = useCallback(() => {
    void refetchPools();
    void refetchPrices();
    void refetchDeposits();
    void refetchHoldings();
  }, [refetchPools, refetchPrices, refetchDeposits, refetchHoldings]);

  const failed = [pools, prices, deposits, holdings].find((query) => query.data === undefined && query.isError);
  if (failed) return { status: "error", error: failed.error as Error, retry };
  if (pools.data === undefined || prices.data === undefined || deposits.data === undefined || holdings.data === undefined) return { status: "loading" };

  const walletRaw = holdings.data.holdings.find((holding) => holding.symbol.toLowerCase() === id)?.raw ?? 0n;
  const market = buildMarket(id, pools.data, prices.data, walletRaw, deposits.data.find((deposit) => deposit.symbol.toLowerCase() === id));
  return market ? { status: "ready", data: market, stale: [pools, prices, deposits, holdings].some((query) => query.isError), refresh: retry } : { status: "empty" };
}
