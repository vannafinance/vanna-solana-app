import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { useOraclePrices } from "@/hooks/use-oracle-prices";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useWalletTransactionsOptions } from "@/hooks/use-wallet-transactions";
import { toHistoryEntries, volumeSince } from "@/lib/swap/spot-swap-history";
import { groupHistoryByDay } from "@/lib/swap/group-history";
import { spotSwapsFrom } from "@/lib/solana/spot-swaps";
import type { Resource } from "@/types/resource";
import type { SwapHistory } from "@/types/swap";

// Wallet-level Jupiter swaps, decoded from the wallet's own transactions on the fork. Prices only add a
// volume figure, so a failed price read leaves the history itself intact.
export function useSwapHistory(): Resource<SwapHistory> {
  const wallet = useWalletAddress();
  const transactions = useQuery({
    ...useWalletTransactionsOptions(wallet),
    select: (data) => (wallet === null ? [] : spotSwapsFrom(data, wallet)),
  });
  const prices = useOraclePrices();
  const { refetch } = transactions;
  const retry = useCallback(() => void refetch(), [refetch]);

  if (wallet === null || (transactions.data !== undefined && transactions.data.length === 0)) return { status: "empty" };
  if (transactions.data === undefined) {
    return transactions.isError ? { status: "error", error: transactions.error, retry } : { status: "loading" };
  }

  const entries = toHistoryEntries(transactions.data, prices.data ?? {});
  return {
    status: "ready",
    stale: transactions.isError,
    refresh: retry,
    data: { volumeUsd: volumeSince(entries, transactions.dataUpdatedAt), groups: groupHistoryByDay(entries) },
  };
}
