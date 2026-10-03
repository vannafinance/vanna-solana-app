import { useCallback } from "react";

import { useOraclePrices } from "@/hooks/use-oracle-prices";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useSpotSwaps } from "@/hooks/use-spot-swaps";
import { toHistoryEntries, volumeSince } from "@/lib/swap/spot-swap-history";
import { groupHistoryByDay } from "@/lib/swap/group-history";
import type { Resource } from "@/types/resource";
import type { SwapHistory } from "@/types/swap";

// Wallet-level Jupiter swaps from the web app's spot history route. Prices only add a volume figure, so a failed price
// read leaves the history itself intact.
export function useSwapHistory(): Resource<SwapHistory> {
  const wallet = useWalletAddress();
  const transactions = useSpotSwaps(wallet);
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
