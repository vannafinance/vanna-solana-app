import { useQuery } from "@tanstack/react-query";

import { fetchPools } from "@/lib/solana/pools-api";

const STALE_MS = 15_000;

export function usePools() {
  return useQuery({
    queryKey: ["pools"],
    queryFn: ({ signal }) => fetchPools(signal),
    staleTime: STALE_MS,
    retry: 1,
  });
}
