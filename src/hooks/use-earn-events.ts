import { useQuery } from "@tanstack/react-query";

import { fetchEarnEvents } from "@/lib/solana/earn-history";
import { rpcConnection } from "@/lib/solana/rpc";

import { queryKeys } from "./query-keys";

const STALE_MS = 30_000;

export function useEarnEvents(wallet: string | null) {
  return useQuery({
    queryKey: queryKeys.earnEvents(wallet ?? "none"),
    queryFn: () => fetchEarnEvents(rpcConnection, wallet as string),
    enabled: wallet !== null,
    staleTime: STALE_MS,
    retry: 1,
  });
}
