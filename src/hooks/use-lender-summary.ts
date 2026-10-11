import { useCallback } from "react";

import { useEarnDeposits } from "@/hooks/use-earn-deposits";
import { useEarnEvents } from "@/hooks/use-earn-events";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { groupLenderHistory } from "@/lib/portfolio/lender-history";
import { totalEarned, vaultEarnings } from "@/lib/portfolio/net-earnings";
import { averageApyBps } from "@/lib/portfolio/value-deposits";
import type { LenderSummary } from "@/types/portfolio";
import type { Resource } from "@/types/resource";

// Vault deposits are the primary source. History is optional: when it fails, earnings and history are null rather than
// zero or empty, so a failure is never shown as "nothing there". Wallet balances are not lending and are left out.
export function useLenderSummary(): Resource<LenderSummary> {
  const wallet = useWalletAddress();
  const deposits = useEarnDeposits(wallet);
  const events = useEarnEvents(wallet);
  const { refetch: refetchDeposits } = deposits;
  const { refetch: refetchEvents } = events;
  const retry = useCallback(() => {
    void refetchDeposits();
    void refetchEvents();
  }, [refetchDeposits, refetchEvents]);

  if (wallet === null) return { status: "empty" };
  if (deposits.data === undefined) {
    return deposits.isError ? { status: "error", error: deposits.error, retry } : { status: "loading" };
  }

  const earnings = events.data ? vaultEarnings(deposits.data, events.data) : null;
  const earned = earnings === null ? null : new Map(earnings.map((entry) => [entry.symbol, entry.earned]));
  return {
    status: "ready",
    stale: deposits.isError,
    refresh: retry,
    data: {
      supplied: deposits.data.reduce((sum, deposit) => sum + deposit.value, 0n),
      avgSupplyApyBps: averageApyBps(deposits.data),
      // The same figure as the Portfolio header's Earn P&L.
      earned: earnings === null ? null : totalEarned(earnings),
      vaults: deposits.data.map((deposit) => ({
        id: deposit.symbol.toLowerCase(),
        symbol: deposit.symbol,
        name: `${deposit.symbol} vault`,
        value: deposit.value,
        supplied: { raw: deposit.supplied, decimals: deposit.decimals },
        supplyApyBps: deposit.supplyApyBps,
        earned: earned?.get(deposit.symbol) ?? null,
      })),
      history: events.data ? groupLenderHistory(events.data) : null,
    },
  };
}
