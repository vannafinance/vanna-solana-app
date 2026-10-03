import { useQuery } from "@tanstack/react-query";

import { fetchEarnEvents } from "@/lib/solana/earn-history";

import { queryKeys } from "./query-keys";
import { useLiveInterval } from "./use-live-interval";

const LIVE_MS = 30_000;
const STALE_MS = 30_000;

export function useEarnEvents(wallet: string | null) {
  const refetchInterval = useLiveInterval(LIVE_MS);
  return useQuery({
    queryKey: queryKeys.earnEvents(wallet ?? "none"),
    queryFn: ({ signal }) => fetchEarnEvents(wallet as string, signal),
    enabled: wallet !== null,
    staleTime: STALE_MS,
    refetchInterval,
    retry: 1,
  });
}
