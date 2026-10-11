import { useCallback } from "react";

import { buildVaultDetail } from "@/lib/earn/vault-detail";
import type { VaultDetail } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { useEarnDeposits } from "./use-earn-deposits";
import { useEarnEvents } from "./use-earn-events";
import { useOraclePrices } from "./use-oracle-prices";
import { usePools } from "./use-pools";
import { useVaultAccounts } from "./use-vault-accounts";
import { useWalletAddress } from "./use-wallet-address";

// The vault's own figures come from the chain and the pool API. The wallet's position is read too, and a failed read of it
// is an error rather than a vault that looks like it has no position.
export function useVault(id: string): Resource<VaultDetail> {
  const wallet = useWalletAddress();
  const pools = usePools();
  const prices = useOraclePrices();
  const accounts = useVaultAccounts();
  const deposits = useEarnDeposits(wallet);
  const events = useEarnEvents(wallet);
  const { refetch: refetchPools } = pools;
  const { refetch: refetchPrices } = prices;
  const { refetch: refetchAccounts } = accounts;
  const { refetch: refetchDeposits } = deposits;
  const retry = useCallback(() => {
    void refetchPools();
    void refetchPrices();
    void refetchAccounts();
    void refetchDeposits();
  }, [refetchPools, refetchPrices, refetchAccounts, refetchDeposits]);

  const needed = [pools, prices, accounts, ...(wallet === null ? [] : [deposits])];
  const failed = needed.find((query) => query.data === undefined && query.isError);
  if (failed?.error) return { status: "error", error: failed.error, retry };
  if (needed.some((query) => query.data === undefined)) return { status: "loading" };
  if (pools.data === undefined || prices.data === undefined || accounts.data === undefined) return { status: "loading" };

  const vault = buildVaultDetail({
    id,
    pools: pools.data,
    prices: prices.data,
    accounts: accounts.data,
    deposit: deposits.data?.find((deposit) => deposit.symbol.toLowerCase() === id),
    events: events.data ?? [],
  });
  return vault ? { status: "ready", data: vault, stale: needed.some((query) => query.isError), refresh: retry } : { status: "empty" };
}
