import { useCallback } from "react";

import { useEarnDeposits } from "@/hooks/use-earn-deposits";
import { useEarnEvents } from "@/hooks/use-earn-events";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useWalletHoldings } from "@/hooks/use-wallet-holdings";
import { summarizePortfolio, totalEarnedUsd } from "@/lib/earn/portfolio";
import { vaultId } from "@/lib/earn/vault-meta";
import { vaultEarnings } from "@/lib/portfolio/net-earnings";
import type { EarnPortfolio, EarnPosition } from "@/types/earn";
import type { Resource } from "@/types/resource";

// Deposits are the primary source. Earnings (from history) and the wallet total are optional and show as
// unavailable when their own read fails.
export function useEarnPositions(): Resource<EarnPortfolio> {
  const wallet = useWalletAddress();
  const deposits = useEarnDeposits(wallet);
  const events = useEarnEvents(wallet);
  const holdings = useWalletHoldings(wallet);
  const { refetch: refetchDeposits } = deposits;
  const { refetch: refetchEvents } = events;
  const { refetch: refetchHoldings } = holdings;
  const retry = useCallback(() => {
    void refetchDeposits();
    void refetchEvents();
    void refetchHoldings();
  }, [refetchDeposits, refetchEvents, refetchHoldings]);

  if (wallet === null) return { status: "empty" };
  if (deposits.data === undefined) {
    return deposits.isError ? { status: "error", error: deposits.error, retry } : { status: "loading" };
  }

  const earned = events.data ? new Map(vaultEarnings(deposits.data, events.data).map((entry) => [entry.symbol, entry.earned])) : null;
  const positions: EarnPosition[] = deposits.data.map((deposit) => ({
    vaultId: vaultId(deposit.symbol),
    symbol: deposit.symbol,
    supplied: { raw: deposit.supplied, decimals: deposit.decimals },
    valueUsd: deposit.value,
    supplyApyBps: deposit.supplyApyBps,
    earnedUsd: earned?.get(deposit.symbol) ?? null,
  }));

  return {
    status: "ready",
    stale: deposits.isError,
    refresh: retry,
    data: { summary: summarizePortfolio(positions, holdings.data?.total ?? null), positions, earnedUsd: totalEarnedUsd(positions) },
  };
}
