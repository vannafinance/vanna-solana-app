import { useCallback } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useWalletHoldings } from "@/hooks/use-wallet-holdings";
import type { Portfolio } from "@/types/portfolio";
import type { Resource } from "@/types/resource";

// The margin snapshot is the primary source: without it there is no Portfolio. The wallet read can
// fail on its own, in which case those two figures are null and the screen shows them as unavailable.
export function usePortfolio(): Resource<Portfolio> {
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const holdings = useWalletHoldings(wallet);
  const { refetch: refetchAccount } = account;
  const { refetch: refetchHoldings } = holdings;
  const retry = useCallback(() => {
    void refetchAccount();
    void refetchHoldings();
  }, [refetchAccount, refetchHoldings]);

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
      netEarnings: null,
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
