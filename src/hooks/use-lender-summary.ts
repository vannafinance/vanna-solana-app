import { useCallback } from "react";

import { useEarnDeposits } from "@/hooks/use-earn-deposits";
import { useEarnEvents } from "@/hooks/use-earn-events";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useWalletHoldings } from "@/hooks/use-wallet-holdings";
import { groupLenderHistory } from "@/lib/portfolio/lender-history";
import { vaultEarnings } from "@/lib/portfolio/net-earnings";
import { averageApyBps } from "@/lib/portfolio/value-deposits";
import type { LenderSummary } from "@/types/portfolio";
import type { Resource } from "@/types/resource";

// Vault deposits are the primary source. Wallet balances and history are optional: when either fails
// its fields are null rather than empty, so a failure is never shown as "nothing there".
export function useLenderSummary(): Resource<LenderSummary> {
  const wallet = useWalletAddress();
  const deposits = useEarnDeposits(wallet);
  const holdings = useWalletHoldings(wallet);
  const events = useEarnEvents(wallet);
  const { refetch: refetchDeposits } = deposits;
  const { refetch: refetchHoldings } = holdings;
  const { refetch: refetchEvents } = events;
  const retry = useCallback(() => {
    void refetchDeposits();
    void refetchHoldings();
    void refetchEvents();
  }, [refetchDeposits, refetchHoldings, refetchEvents]);

  if (wallet === null) return { status: "empty" };
  if (deposits.data === undefined) {
    return deposits.isError ? { status: "error", error: deposits.error, retry } : { status: "loading" };
  }

  const earned = events.data ? new Map(vaultEarnings(deposits.data, events.data).map((entry) => [entry.symbol, entry.earned])) : null;
  const portfolio = deposits.data.reduce((sum, deposit) => sum + deposit.value, 0n);
  return {
    status: "ready",
    stale: deposits.isError,
    refresh: retry,
    data: {
      portfolio,
      totalHoldings: holdings.data ? portfolio + holdings.data.total : null,
      avgSupplyApyBps: averageApyBps(deposits.data),
      vaults: deposits.data.map((deposit) => ({
        id: deposit.symbol.toLowerCase(),
        symbol: deposit.symbol,
        name: `${deposit.symbol} vault`,
        value: deposit.value,
        supplied: { raw: deposit.supplied, decimals: deposit.decimals },
        supplyApyBps: deposit.supplyApyBps,
        earned: earned?.get(deposit.symbol) ?? null,
      })),
      spot: holdings.data?.holdings.map((holding) => ({ symbol: holding.symbol, tokens: { raw: holding.raw, decimals: holding.decimals }, value: holding.value })) ?? null,
      history: events.data ? groupLenderHistory(events.data) : null,
    },
  };
}
