import { useQuery } from "@tanstack/react-query";

import { rpcConnection } from "@/lib/solana/rpc";
import { fetchVaultAccounts } from "@/lib/solana/vault-accounts";

import { useLiveInterval } from "./use-live-interval";

const LIVE_MS = 30_000;
const STALE_MS = 15_000;

export function useVaultAccounts() {
  const refetchInterval = useLiveInterval(LIVE_MS);
  return useQuery({
    queryKey: ["vault-accounts"],
    queryFn: () => fetchVaultAccounts(rpcConnection),
    staleTime: STALE_MS,
    refetchInterval,
    retry: 1,
  });
}
