import { useCallback } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useMarginAccount } from "@/hooks/use-margin-account";
import { useFarmState } from "@/hooks/use-farm-state";
import { usePerpsPositions } from "@/hooks/use-perps-positions";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { toPortfolioFarmPosition } from "@/lib/farm/portfolio-position";
import { toPortfolioPosition } from "@/lib/perps/portfolio-position";
import type { Resource } from "@/types/resource";
import type { TraderSummary } from "@/types/portfolio";

// Account figures and open Perps and Farm positions are live. Closed-position history is flagged unavailable rather than
// shown as empty or zero.
export function useTraderSummary(): { summary: Resource<TraderSummary>; marginExists: boolean } {
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const { exists } = useMarginAccount();
  const perps = usePerpsPositions();
  const farm = useFarmState();
  const { refetch } = account;
  const retry = useCallback(() => void refetch(), [refetch]);

  if (wallet === null) return { summary: { status: "empty" }, marginExists: false };
  if (account.data === undefined) {
    return { summary: account.isError ? { status: "error", error: account.error, retry } : { status: "loading" }, marginExists: exists };
  }

  const snapshot = account.data;
  const open = perps.status === "ready" && perps.data.positionsAvailable ? perps.data : null;
  const farmPositions = farm.status === "ready" ? farm.data.positions.map(toPortfolioFarmPosition) : null;
  return {
    summary: {
      status: "ready",
      stale: account.isError,
      refresh: retry,
      data: {
        positionsAvailable: open !== null && farmPositions !== null,
        perpPnl: open === null ? null : open.openPnl,
        farmPnl: farmPositions === null ? null : farmPositions.reduce((sum, position) => sum + position.pnl, 0n),
        margin: snapshot.collateral,
        available: snapshot.netAvailable,
        borrowed: snapshot.borrowed,
        health: snapshot.health,
        current: open === null || farmPositions === null ? [] : [...open.positions.map(toPortfolioPosition), ...farmPositions],
      },
    },
    marginExists: exists,
  };
}
