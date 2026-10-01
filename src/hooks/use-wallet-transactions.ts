import { queryOptions } from "@tanstack/react-query";

import { rpcConnection } from "@/lib/solana/rpc";
import { fetchWalletTransactions } from "@/lib/solana/wallet-transactions";

import { queryKeys } from "./query-keys";

const STALE_MS = 30_000;

// One shared request: Earn and Swap history, and later Margin history, all derive from the same parsed transactions.
export function walletTransactionsOptions(wallet: string | null) {
  return queryOptions({
    queryKey: queryKeys.walletTransactions(wallet ?? "none"),
    queryFn: () => fetchWalletTransactions(rpcConnection, wallet as string),
    enabled: wallet !== null,
    staleTime: STALE_MS,
    retry: 1,
  });
}
