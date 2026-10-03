import { useQuery } from "@tanstack/react-query";

import { fetchSpotSwaps } from "@/lib/solana/spot-swaps";

import { queryKeys } from "./query-keys";
import { useLiveInterval } from "./use-live-interval";

const LIVE_MS = 30_000;
const STALE_MS = 30_000;

export function useSpotSwaps(wallet: string | null) {
  const refetchInterval = useLiveInterval(LIVE_MS);
  return useQuery({
    queryKey: queryKeys.spotSwaps(wallet ?? "none"),
    queryFn: ({ signal }) => fetchSpotSwaps(wallet as string, signal),
    enabled: wallet !== null,
    staleTime: STALE_MS,
    refetchInterval,
    retry: 1,
  });
}
