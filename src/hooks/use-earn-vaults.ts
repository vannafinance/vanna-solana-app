import { useCallback, useState } from "react";

import { useEarnDeposits } from "@/hooks/use-earn-deposits";
import { useOraclePrices } from "@/hooks/use-oracle-prices";
import { usePools } from "@/hooks/use-pools";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { buildVaultSummaries } from "@/lib/earn/build-vaults";
import { vaultCategories } from "@/lib/earn/vault-meta";
import type { PoolFilterOption, VaultSummary } from "@/types/earn";
import type { Resource } from "@/types/resource";

export function useEarnVaults() {
  const [filter, setFilter] = useState<PoolFilterOption["value"]>("all");
  const wallet = useWalletAddress();
  const pools = usePools();
  const prices = useOraclePrices();
  const deposits = useEarnDeposits(wallet);
  const { refetch: refetchPools } = pools;
  const { refetch: refetchPrices } = prices;
  const retry = useCallback(() => {
    void refetchPools();
    void refetchPrices();
  }, [refetchPools, refetchPrices]);

  const ready = pools.data !== undefined && prices.data !== undefined;
  const vaults: Resource<readonly VaultSummary[]> = (() => {
    if (!ready) {
      const failed = pools.isError ? pools.error : prices.isError ? prices.error : null;
      return failed ? { status: "error", error: failed, retry } : { status: "loading" };
    }
    const summaries = buildVaultSummaries(pools.data, prices.data, deposits.data ?? []);
    const filtered = summaries.filter((vault) => filter === "all" || vault.category === filter).sort((a, b) => b.supplyApyBps - a.supplyApyBps);
    return filtered.length === 0 ? { status: "empty" } : { status: "ready", data: filtered };
  })();

  const all = ready ? buildVaultSummaries(pools.data, prices.data, []) : [];
  const filterOptions: PoolFilterOption[] = [
    { value: "all", count: all.length },
    ...vaultCategories.map((category) => ({ value: category, count: all.filter((vault) => vault.category === category).length })),
  ];

  return { filter, setFilter, filterOptions, vaults };
}
