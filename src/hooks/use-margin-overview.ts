import { useCallback } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useFarmState } from "@/hooks/use-farm-state";
import { usePerpsPositions } from "@/hooks/use-perps-positions";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { toPortfolioFarmPosition } from "@/lib/farm/portfolio-position";
import { toPortfolioPosition } from "@/lib/perps/portfolio-position";
import type { MarginOverview, MarginUse } from "@/types/margin-overview";
import type { Position } from "@/types/portfolio";
import type { Resource } from "@/types/resource";

function summarize(positions: Position[]): MarginUse {
  return {
    count: positions.length,
    pnl: positions.reduce((sum, position) => sum + position.pnl, 0n),
    value: positions.reduce((sum, position) => sum + position.size, 0n),
  };
}

export function useMarginOverview(): Resource<MarginOverview> {
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

  const snapshot = account.data;
  return {
    status: "ready",
    stale: account.isError,
    refresh: retry,
    data: {
      hasMarginAccount: snapshot.hasMarginAccount,
      collateral: snapshot.collateral,
      borrowed: snapshot.borrowed,
      net: snapshot.netAvailable,
      health: snapshot.health,
      leverage: snapshot.leverage,
      roomBeforeLiquidation: snapshot.roomBeforeLiquidation,
      roomBps: snapshot.collateral > 0n ? Number((snapshot.roomBeforeLiquidation * 10_000n) / snapshot.collateral) : null,
      perps: perps.status === "ready" && perps.data.positionsAvailable ? summarize(perps.data.positions.map(toPortfolioPosition)) : null,
      farm: farm.status === "ready" ? summarize(farm.data.positions.map(toPortfolioFarmPosition)) : null,
    },
  };
}
