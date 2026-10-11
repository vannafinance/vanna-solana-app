import { useQuery } from "@tanstack/react-query";

import { fetchKaminoStats } from "@/lib/solana/kamino";
import { rpcConnection } from "@/lib/solana/rpc";

import { useLiveInterval } from "./use-live-interval";

const LIVE_MS = 30_000;
const STALE_MS = 15_000;

export function useKaminoStats() {
  const refetchInterval = useLiveInterval(LIVE_MS);
  return useQuery({
    queryKey: ["kamino-stats"],
    queryFn: () => fetchKaminoStats(rpcConnection),
    staleTime: STALE_MS,
    refetchInterval,
    retry: 1,
  });
}
