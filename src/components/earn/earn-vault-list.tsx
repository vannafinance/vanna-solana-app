import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ResourceView } from "@/components/ui/resource-view";
import { formatCompactUsd, formatPercent } from "@/format/format-amount";
import { formatSummaryNumber } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { VaultSummary } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { VaultRow } from "./vault-row";

type EarnVaultListProps = {
  vaults: Resource<readonly VaultSummary[]>;
  emptyLabel: string;
  onSelect: (id: string) => void;
};

export function EarnVaultList({ vaults, emptyLabel, onSelect }: EarnVaultListProps) {
  const { colors, spacing } = useTheme();

  return (
    <ResourceView resource={vaults} emptyLabel={emptyLabel}>
      {(data) => (
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          <View style={{ height: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <AppText variant="caption" color="textMuted">
              Vault
            </AppText>
            <AppText variant="caption" color="textMuted">
              Supply APY
            </AppText>
          </View>
          {data.map((vault) => (
            <View key={vault.id} style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
              <VaultRow
                symbol={vault.symbol}
                supplied={formatCompactUsd(vault.suppliedUsd)}
                borrowed={formatCompactUsd(vault.borrowedUsd)}
                apy={formatPercent(vault.supplyApyBps)}
                yourSupply={vault.yourSupply ? formatSummaryNumber(vault.yourSupply, vault.symbol) : undefined}
                onPress={() => onSelect(vault.id)}
              />
            </View>
          ))}
        </Card>
      )}
    </ResourceView>
  );
}
