import { useCallback } from "react";

import { useEarnDeposits } from "@/hooks/use-earn-deposits";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useWalletHoldings } from "@/hooks/use-wallet-holdings";
import { averageApyBps } from "@/lib/portfolio/value-deposits";
import type { LenderSummary } from "@/types/portfolio";
import type { Resource } from "@/types/resource";

// Vault deposits are the primary source. Wallet balances are optional, and history has no working
// source yet (the hosted history route is failing), so it is null rather than an empty list.
export function useLenderSummary(): Resource<LenderSummary> {
  const wallet = useWalletAddress();
  const deposits = useEarnDeposits(wallet);
  const holdings = useWalletHoldings(wallet);
  const { refetch: refetchDeposits } = deposits;
  const { refetch: refetchHoldings } = holdings;
  const retry = useCallback(() => {
    void refetchDeposits();
    void refetchHoldings();
  }, [refetchDeposits, refetchHoldings]);

  if (wallet === null) return { status: "empty" };
  if (deposits.data === undefined) {
    return deposits.isError ? { status: "error", error: deposits.error, retry } : { status: "loading" };
  }

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
        earned: null,
      })),
      spot: holdings.data?.holdings.map((holding) => ({ symbol: holding.symbol, tokens: { raw: holding.raw, decimals: holding.decimals }, value: holding.value })) ?? null,
      history: null,
    },
  };
}
