import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { marginActivityFrom } from "@/lib/solana/margin-history";
import type { WalletTransaction } from "@/lib/solana/wallet-transactions";
import type { HistoryStrategy, MarginActivity } from "@/types/margin-history";
import type { Resource } from "@/types/resource";

import { useWalletTransactionsOptions } from "./use-wallet-transactions";

// Every action of the margin account of the given kinds, one entry per transaction, newest first, failed ones included and
// marked: history shows what was tried as well as what went through.
// `strategies` must be a constant: a new array on each render would make the selector recompute every time.
export function useMarginActivity(strategies: readonly HistoryStrategy[]): Resource<MarginActivity[]> {
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const margin = account.data?.address ?? null;
  const select = useCallback(
    (data: WalletTransaction[]) => (margin === null ? [] : marginActivityFrom(data, margin, { includeFailed: true }).filter((entry) => strategies.includes(entry.strategy))),
    [margin, strategies],
  );
  const transactions = useQuery({ ...useWalletTransactionsOptions(wallet), select });
  const { refetch } = transactions;
  const retry = useCallback(() => void refetch(), [refetch]);

  if (wallet === null) return { status: "empty" };
  if (transactions.data === undefined) return transactions.isError ? { status: "error", error: transactions.error, retry } : { status: "loading" };
  if (transactions.data.length === 0) return { status: "empty" };
  return { status: "ready", stale: transactions.isError, refresh: retry, data: transactions.data };
}

const PERPS_STRATEGIES: readonly HistoryStrategy[] = ["perps", "unclassified"];

// Farm transactions have their own tab, so Trade lists only perps and unclassified ones, as on the web app.
export function usePerpsActivity(): Resource<MarginActivity[]> {
  return useMarginActivity(PERPS_STRATEGIES);
}
