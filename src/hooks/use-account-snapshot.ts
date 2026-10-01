import { useQuery } from "@tanstack/react-query";

import { fetchAccountSnapshot } from "@/lib/solana/account-api";

import { useLiveInterval } from "./use-live-interval";
import { queryKeys } from "./query-keys";

const LIVE_MS = 10_000;
const STALE_MS = 12_000;

export function useAccountSnapshot(wallet: string | null) {
  const refetchInterval = useLiveInterval(LIVE_MS);
  return useQuery({
    queryKey: queryKeys.accountSnapshot(wallet ?? "none"),
    queryFn: ({ signal }) => fetchAccountSnapshot(wallet as string, signal),
    enabled: wallet !== null,
    staleTime: STALE_MS,
    refetchInterval,
    retry: 1,
  });
}
