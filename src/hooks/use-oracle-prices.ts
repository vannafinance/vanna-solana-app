import { useQuery } from "@tanstack/react-query";

import { fetchOraclePrices } from "@/lib/solana/oracle-prices";
import { rpcConnection } from "@/lib/solana/rpc";

const STALE_MS = 12_000;

export function useOraclePrices() {
  return useQuery({
    queryKey: ["oracle-prices"],
    queryFn: () => fetchOraclePrices(rpcConnection),
    staleTime: STALE_MS,
    retry: 1,
  });
}
