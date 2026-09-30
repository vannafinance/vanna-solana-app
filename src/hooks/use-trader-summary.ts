import * as WebBrowser from "expo-web-browser";

import { previewResource } from "@/hooks/preview-resource";
import { useMarginAccount } from "@/hooks/use-margin-account";
import { previewAccount, previewClosedPositions, previewPositions } from "@/lib/preview-data/home";
import type { Resource } from "@/types/resource";
import type { TraderSummary } from "@/types/portfolio";

import { marginMetrics } from "./margin-metrics";

const BPS = 10_000;

export function useTraderSummary(): { summary: Resource<TraderSummary>; marginExists: boolean; openExplorer: () => void } {
  const { exists } = useMarginAccount();
  const margin = exists ? previewAccount.marginBalance : 0n;
  const borrowed = exists ? previewAccount.totalBorrowed : 0n;
  const current = exists ? previewPositions : [];
  const history = exists ? previewClosedPositions : [];
  const winners = history.filter((position) => position.pnl > 0n).length;
  const explorerUrl = `https://solscan.io/account/${previewAccount.marginAddress}`;

  const metrics = marginMetrics(margin, borrowed);
  const summary = previewResource<TraderSummary>({
    pnl: current.reduce((total, position) => total + position.pnl, 0n),
    margin,
    available: metrics.netAvailable,
    borrowed,
    health: metrics.health,
    current,
    history,
    realizedPnl: history.reduce((total, position) => total + position.pnl, 0n),
    winRateBps: history.length === 0 ? 0 : Math.round((winners / history.length) * BPS),
    explorerUrl,
  });

  return { summary, marginExists: exists, openExplorer: () => void WebBrowser.openBrowserAsync(explorerUrl) };
}
