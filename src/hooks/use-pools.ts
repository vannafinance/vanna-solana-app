import { useQuery } from "@tanstack/react-query";

import { fetchPools } from "@/lib/solana/pools-api";

import { useLiveInterval } from "./use-live-interval";

const LIVE_MS = 15_000;
const STALE_MS = 15_000;

export function usePools() {
  const refetchInterval = useLiveInterval(LIVE_MS);
  return useQuery({
    queryKey: ["pools"],
    queryFn: ({ signal }) => fetchPools(signal),
    staleTime: STALE_MS,
    refetchInterval,
    retry: 1,
  });
}
