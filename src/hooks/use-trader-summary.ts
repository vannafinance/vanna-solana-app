import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useMarginAccount } from "@/hooks/use-margin-account";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import type { Resource } from "@/types/resource";
import type { TraderSummary } from "@/types/portfolio";

// Account figures are live. Position lists and PnL need the web app's Perps and Farm attribution, which has no
// source on the phone yet, so they are flagged unavailable rather than shown as empty or zero.
export function useTraderSummary(): { summary: Resource<TraderSummary>; marginExists: boolean; openExplorer: () => void } {
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const { exists } = useMarginAccount();
  const { refetch } = account;
  const retry = useCallback(() => void refetch(), [refetch]);

  const explorerUrl = account.data?.address ? `https://solscan.io/account/${account.data.address}` : "";
  const openExplorer = () => {
    if (explorerUrl !== "") void WebBrowser.openBrowserAsync(explorerUrl);
  };

  if (wallet === null) return { summary: { status: "empty" }, marginExists: false, openExplorer };
  if (account.data === undefined) {
    return { summary: account.isError ? { status: "error", error: account.error, retry } : { status: "loading" }, marginExists: exists, openExplorer };
  }

  const snapshot = account.data;
  return {
    summary: {
      status: "ready",
      stale: account.isError,
      refresh: retry,
      data: {
        positionsAvailable: false,
        perpPnl: null,
        farmPnl: null,
        margin: snapshot.collateral,
        available: snapshot.netAvailable,
        borrowed: snapshot.borrowed,
        health: snapshot.health,
        current: [],
        history: [],
        realizedPnl: null,
        winRateBps: 0,
        explorerUrl,
      },
    },
    marginExists: exists,
    openExplorer,
  };
}
