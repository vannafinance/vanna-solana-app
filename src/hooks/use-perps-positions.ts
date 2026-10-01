import { useCallback } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { buildAccount } from "@/lib/perps/account-health";
import type { PerpsPortfolio } from "@/types/perps";
import type { Resource } from "@/types/resource";

// The account figures are live. The open and closed position lists need the web app's attribution rules (they
// separate Perps from Farm positions) and have no source on the phone yet, so they are empty and flagged
// unavailable instead of pretending there are none.
export function usePerpsPositions(): Resource<PerpsPortfolio> {
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const { refetch } = account;
  const retry = useCallback(() => void refetch(), [refetch]);

  if (wallet === null) return { status: "empty" };
  if (account.data === undefined) return account.isError ? { status: "error", error: account.error, retry } : { status: "loading" };

  return {
    status: "ready",
    stale: account.isError,
    refresh: retry,
    data: {
      account: buildAccount(account.data.collateral, account.data.borrowed),
      positionsAvailable: false,
      positions: [],
      openPnl: 0n,
      closed: [],
      realizedPnl: 0n,
      winRateBps: 0,
    },
  };
}
