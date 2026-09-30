import { router, useLocalSearchParams } from "expo-router";

import { EarnUnavailable } from "@/components/earn/earn-unavailable";
import { VaultDetailScreen } from "@/components/earn/vault-detail-screen";
import { useVault } from "@/hooks/use-vault";

export default function VaultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vault = useVault(id);

  if (vault.status !== "ready") {
    return <EarnUnavailable title="Vault" resource={vault} emptyLabel="Vault not found" onBack={() => router.back()} />;
  }

  return (
    <VaultDetailScreen
      vault={vault.data}
      onBack={() => router.back()}
      onSupply={() => router.push(`/earn/supply/${id}`)}
      onWithdraw={() => router.push(`/earn/withdraw/${id}`)}
    />
  );
}
