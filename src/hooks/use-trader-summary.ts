import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useMarginAccount } from "@/hooks/use-margin-account";
import { usePerpsPositions } from "@/hooks/use-perps-positions";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { toPortfolioPosition } from "@/lib/perps/portfolio-position";
import { explorerAccountUrl } from "@/lib/solana/explorer";
import type { Resource } from "@/types/resource";
import type { TraderSummary } from "@/types/portfolio";

// Account figures and open perps positions are live. Farm positions and closed-position history need the web app's
// attribution, which has no source on the phone yet, so they are flagged unavailable rather than shown as empty or zero.
export function useTraderSummary(): { summary: Resource<TraderSummary>; marginExists: boolean; openExplorer: () => void } {
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const { exists } = useMarginAccount();
  const perps = usePerpsPositions();
  const { refetch } = account;
  const retry = useCallback(() => void refetch(), [refetch]);

  const explorerUrl = account.data?.address ? explorerAccountUrl(account.data.address) : "";
  const openExplorer = () => {
    if (explorerUrl !== "") void WebBrowser.openBrowserAsync(explorerUrl);
  };

  if (wallet === null) return { summary: { status: "empty" }, marginExists: false, openExplorer };
  if (account.data === undefined) {
    return { summary: account.isError ? { status: "error", error: account.error, retry } : { status: "loading" }, marginExists: exists, openExplorer };
  }

  const snapshot = account.data;
  const open = perps.status === "ready" && perps.data.positionsAvailable ? perps.data : null;
  return {
    summary: {
      status: "ready",
      stale: account.isError,
      refresh: retry,
      data: {
        positionsAvailable: open !== null,
        historyAvailable: false,
        perpPnl: open === null ? null : open.openPnl,
        farmPnl: null,
        margin: snapshot.collateral,
        available: snapshot.netAvailable,
        borrowed: snapshot.borrowed,
        health: snapshot.health,
        current: open === null ? [] : open.positions.map(toPortfolioPosition),
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
