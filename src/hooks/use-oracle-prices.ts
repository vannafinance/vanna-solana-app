import { useQuery } from "@tanstack/react-query";

import { fetchOraclePrices } from "@/lib/solana/oracle-prices";
import { rpcConnection } from "@/lib/solana/rpc";

import { useLiveInterval } from "./use-live-interval";

const LIVE_MS = 8_000;
const STALE_MS = 12_000;

export function useOraclePrices() {
  const refetchInterval = useLiveInterval(LIVE_MS);
  return useQuery({
    queryKey: ["oracle-prices"],
    queryFn: () => fetchOraclePrices(rpcConnection),
    staleTime: STALE_MS,
    refetchInterval,
    retry: 1,
  });
}
