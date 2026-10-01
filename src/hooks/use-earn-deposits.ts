import { useQuery } from "@tanstack/react-query";

import { valueDeposits } from "@/lib/portfolio/value-deposits";
import { fetchShareBalances } from "@/lib/solana/earn-deposits";
import { fetchOraclePrices } from "@/lib/solana/oracle-prices";
import { fetchPools } from "@/lib/solana/pools-api";
import { rpcConnection } from "@/lib/solana/rpc";

import { useLiveInterval } from "./use-live-interval";
import { queryKeys } from "./query-keys";

const LIVE_MS = 10_000;
const STALE_MS = 12_000;

export function useEarnDeposits(wallet: string | null) {
  const refetchInterval = useLiveInterval(LIVE_MS);
  return useQuery({
    queryKey: queryKeys.earnDeposits(wallet ?? "none"),
    queryFn: async ({ signal }) => {
      const [shares, pools, prices] = await Promise.all([
        fetchShareBalances(rpcConnection, wallet as string),
        fetchPools(signal),
        fetchOraclePrices(rpcConnection),
      ]);
      return valueDeposits(shares, pools, prices);
    },
    enabled: wallet !== null,
    staleTime: STALE_MS,
    refetchInterval,
    retry: 1,
  });
}
