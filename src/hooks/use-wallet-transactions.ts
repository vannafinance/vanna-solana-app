import { queryOptions } from "@tanstack/react-query";

import { rpcConnection } from "@/lib/solana/rpc";
import { fetchWalletTransactions } from "@/lib/solana/wallet-transactions";

import { useLiveInterval } from "./use-live-interval";
import { queryKeys } from "./query-keys";

const LIVE_MS = 30_000;
const STALE_MS = 30_000;

// One shared request: Earn and Swap history, and later Margin history, all derive from the same parsed transactions.
export function useWalletTransactionsOptions(wallet: string | null) {
  const refetchInterval = useLiveInterval(LIVE_MS);
  return queryOptions({
    queryKey: queryKeys.walletTransactions(wallet ?? "none"),
    queryFn: () => fetchWalletTransactions(rpcConnection, wallet as string),
    enabled: wallet !== null,
    staleTime: STALE_MS,
    refetchInterval,
    retry: 1,
  });
}
