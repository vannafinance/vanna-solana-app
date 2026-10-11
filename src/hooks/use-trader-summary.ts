import { useCallback } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useFarmState } from "@/hooks/use-farm-state";
import { usePerpsPositions } from "@/hooks/use-perps-positions";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { toPortfolioFarmPosition } from "@/lib/farm/portfolio-position";
import { toPortfolioPosition } from "@/lib/perps/portfolio-position";
import type { Resource } from "@/types/resource";
import type { TraderSummary } from "@/types/portfolio";

// The open Perps and Farm positions, listed together. When either cannot be read the list is flagged unavailable rather
// than shown empty. The account-level figures (collateral, health, leverage) come from `useMarginOverview`.
export function useTraderSummary(): Resource<TraderSummary> {
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const perps = usePerpsPositions();
  const farm = useFarmState();
  const { refetch } = account;
  const retry = useCallback(() => void refetch(), [refetch]);

  if (wallet === null) return { status: "empty" };
  if (account.data === undefined) {
    return account.isError ? { status: "error", error: account.error, retry } : { status: "loading" };
  }

  const open = perps.status === "ready" && perps.data.positionsAvailable ? perps.data.positions.map(toPortfolioPosition) : null;
  const farmPositions = farm.status === "ready" ? farm.data.positions.map(toPortfolioFarmPosition) : null;
  return {
    status: "ready",
    stale: account.isError,
    refresh: retry,
    data: {
      positionsAvailable: open !== null && farmPositions !== null,
      current: open === null || farmPositions === null ? [] : [...open, ...farmPositions],
    },
  };
}
