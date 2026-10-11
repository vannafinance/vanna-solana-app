import { router, useLocalSearchParams } from "expo-router";
import { Share } from "react-native";

import { EarnUnavailable } from "@/components/earn/earn-unavailable";
import { VaultScreen } from "@/components/earn/vault-screen";
import { useExplorer } from "@/hooks/use-explorer";
import { useVault } from "@/hooks/use-vault";
import { useVaultAnalytics } from "@/hooks/use-vault-analytics";

export default function VaultRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vault = useVault(id);
  const analytics = useVaultAnalytics(id);
  const explorer = useExplorer();

  if (vault.status !== "ready") {
    return <EarnUnavailable title="Vault" resource={vault} emptyLabel="Vault not found" onBack={() => router.back()} />;
  }

  return (
    <VaultScreen
      vault={vault.data}
      analytics={analytics}
      onBack={() => router.back()}
      onSupply={() => router.push(`/earn/supply/${id}`)}
      onWithdraw={() => router.push(`/earn/withdraw/${id}`)}
      onCopyAddress={(contract) => void Share.share({ message: contract.address })}
      onOpenTransaction={explorer.openTransaction}
    />
  );
}
