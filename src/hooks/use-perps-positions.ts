import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { derivePositions, dustOf } from "@/lib/perps/derive-positions";
import type { AssetSymbol } from "@/lib/solana/assets";
import { withoutFarm } from "@/lib/perps/without-farm";
import { summarizePortfolio } from "@/lib/perps/summarize-portfolio";
import { marginSwapsFrom } from "@/lib/solana/margin-activity";
import type { WalletTransaction } from "@/lib/solana/wallet-transactions";
import type { PerpsPortfolio } from "@/types/perps";
import type { Resource } from "@/types/resource";

import { useFarmState } from "./use-farm-state";
import { useMarketList } from "./use-market-list";
import { useWalletTransactionsOptions } from "./use-wallet-transactions";

// A position is a view of the margin account's balances: stock collateral against USDC debt is a long, stock debt
// against USDC collateral is a short. The entry price and the split of the shared USDC balance come from the account's
// own swap events, as on the web app. Closed positions need the web app's history grouping and are not built yet.
export function usePerpsPositions(): Resource<PerpsPortfolio> {
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const markets = useMarketList();
  const farm = useFarmState();
  const margin = account.data?.address ?? null;
  const select = useCallback((transactions: WalletTransaction[]) => (margin === null ? [] : marginSwapsFrom(transactions, margin)), [margin]);
  const activity = useQuery({ ...useWalletTransactionsOptions(wallet), select });
  const { refetch: refetchAccount } = account;
  const { refetch: refetchActivity } = activity;
  const retry = useCallback(() => {
    void refetchAccount();
    void refetchActivity();
  }, [refetchAccount, refetchActivity]);

  if (wallet === null) return { status: "empty" };
  if (account.data === undefined) return account.isError ? { status: "error", error: account.error, retry } : { status: "loading" };

  const snapshot = account.data;
  // Farm positions share the margin account's balances, so they are read first and taken out of what perps sees.
  const ready = markets.status === "ready" && activity.data !== undefined && farm.status === "ready" ? { markets: markets.data, swaps: activity.data, farm: farm.data.positions } : null;
  const balances = ready === null ? null : withoutFarm({ collateral: snapshot.collateralBalances, debt: snapshot.borrowedBalances }, ready.farm);
  const above = (entries: Record<string, bigint | undefined>) =>
    Object.entries(entries).flatMap(([symbol, raw]) => (symbol !== "USDC" && symbol !== "SOL" && raw !== undefined && raw > dustOf(symbol as AssetSymbol) ? [symbol] : []));
  const derived =
    ready === null || balances === null
      ? null
      : derivePositions({
          ...balances,
          prices: Object.fromEntries(ready.markets.map((market) => [market.symbol, market.markPrice])),
          swaps: ready.swaps,
        });

  const portfolio = summarizePortfolio({
    margin: snapshot.collateral,
    borrowed: snapshot.borrowed,
    markets: ready?.markets ?? [],
    positions: derived?.positions ?? [],
    closed: [],
  });

  return {
    status: "ready",
    stale: account.isError,
    refresh: retry,
    // A stock whose opening swap is not in history is left out on its own; it does not hide the positions that can be read.
    data: { ...portfolio, positionsAvailable: derived !== null, historyAvailable: false, heldStocks: balances ? above(balances.collateral) : [], owedStocks: balances ? above(balances.debt) : [] },
  };
}
