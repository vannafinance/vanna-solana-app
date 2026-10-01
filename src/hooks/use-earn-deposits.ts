import { useQuery } from "@tanstack/react-query";

import { valueDeposits } from "@/lib/portfolio/value-deposits";
import { fetchShareBalances } from "@/lib/solana/earn-deposits";
import { fetchOraclePrices } from "@/lib/solana/oracle-prices";
import { fetchPools } from "@/lib/solana/pools-api";
import { rpcConnection } from "@/lib/solana/rpc";

import { queryKeys } from "./query-keys";

const STALE_MS = 12_000;

export function useEarnDeposits(wallet: string | null) {
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
    retry: 1,
  });
}
