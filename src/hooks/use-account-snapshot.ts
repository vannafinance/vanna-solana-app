import { useQuery } from "@tanstack/react-query";

import { fetchAccountSnapshot } from "@/lib/solana/account-api";

import { queryKeys } from "./query-keys";

const STALE_MS = 12_000;

export function useAccountSnapshot(wallet: string | null) {
  return useQuery({
    queryKey: queryKeys.accountSnapshot(wallet ?? "none"),
    queryFn: ({ signal }) => fetchAccountSnapshot(wallet as string, signal),
    enabled: wallet !== null,
    staleTime: STALE_MS,
    retry: 1,
  });
}
