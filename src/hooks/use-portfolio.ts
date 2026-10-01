import { useCallback } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useEarnDeposits } from "@/hooks/use-earn-deposits";
import { useEarnEvents } from "@/hooks/use-earn-events";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useWalletHoldings } from "@/hooks/use-wallet-holdings";
import { totalEarned, vaultEarnings } from "@/lib/portfolio/net-earnings";
import type { Portfolio } from "@/types/portfolio";
import type { Resource } from "@/types/resource";

// The margin snapshot is the primary source: without it there is no Portfolio. The wallet read can
// fail on its own, in which case those two figures are null and the screen shows them as unavailable.
export function usePortfolio(): Resource<Portfolio> {
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const holdings = useWalletHoldings(wallet);
  const deposits = useEarnDeposits(wallet);
  const events = useEarnEvents(wallet);
  const { refetch: refetchAccount } = account;
  const { refetch: refetchHoldings } = holdings;
  const { refetch: refetchDeposits } = deposits;
  const { refetch: refetchEvents } = events;
  const retry = useCallback(() => {
    void refetchAccount();
    void refetchHoldings();
    void refetchDeposits();
    void refetchEvents();
  }, [refetchAccount, refetchHoldings, refetchDeposits, refetchEvents]);

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
      walletBalance: holdings.data?.total ?? null,
      marginBalance: snapshot.collateral,
      totalBorrowed: snapshot.borrowed,
      netAvailable: snapshot.netAvailable,
      netEarnings: deposits.data && events.data ? totalEarned(vaultEarnings(deposits.data, events.data)) : null,
      health: snapshot.health,
      leverage: snapshot.leverage,
      roomBeforeLiquidation: snapshot.roomBeforeLiquidation,
      hasMarginAccount: snapshot.hasMarginAccount,
      walletAddress: wallet,
      marginAddress: snapshot.address,
      positions: null,
      assets: holdings.data?.holdings.map((holding) => ({
        symbol: holding.symbol,
        tokens: { raw: holding.raw, decimals: holding.decimals },
        value: holding.value,
      })) ?? null,
    },
  };
}
