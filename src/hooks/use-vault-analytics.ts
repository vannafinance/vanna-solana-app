import { buildVaultAnalytics } from "@/lib/earn/vault-analytics";
import type { AssetSymbol } from "@/lib/solana/assets";
import type { VaultReserve } from "@/lib/solana/vault-accounts";
import type { VaultAnalytics } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { usePools } from "./use-pools";
import { useVaultAccounts } from "./use-vault-accounts";

export function useVaultAnalytics(id: string): Resource<VaultAnalytics> {
  const pools = usePools();
  const accounts = useVaultAccounts();
  const { refetch: refetchPools } = pools;
  const { refetch: refetchAccounts } = accounts;

  const failed = [pools, accounts].find((query) => query.data === undefined && query.isError);
  if (failed?.error) {
    return {
      status: "error",
      error: failed.error,
      retry: () => {
        void refetchPools();
        void refetchAccounts();
      },
    };
  }
  if (pools.data === undefined || accounts.data === undefined) return { status: "loading" };

  const reserves: Partial<Record<AssetSymbol, VaultReserve>> = Object.fromEntries(Object.entries(accounts.data).map(([symbol, chain]) => [symbol, chain.reserve]));
  const analytics = buildVaultAnalytics(id, pools.data, reserves);
  return analytics ? { status: "ready", data: analytics } : { status: "empty" };
}
