import { View } from "react-native";

import { ResourceView } from "@/components/ui/resource-view";
import { formatCompactUsd, formatPercent, formatUsd } from "@/format/format-amount";
import { formatFullAmount, formatSummaryNumber } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { VaultSummary } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { formatCompactToken } from "./compact-amount";
import { VaultRow } from "./vault-row";

type EarnVaultListProps = {
  vaults: Resource<readonly VaultSummary[]>;
  emptyLabel: string;
  onSelect: (id: string) => void;
};

export function EarnVaultList({ vaults, emptyLabel, onSelect }: EarnVaultListProps) {
  const { spacing } = useTheme();

  return (
    <ResourceView resource={vaults} emptyLabel={emptyLabel}>
      {(data) => (
        <View style={{ gap: spacing.md }}>
          {data.map((vault) => (
            <VaultRow
              key={vault.id}
              symbol={vault.symbol}
              name={vault.name}
              apy={formatPercent(vault.supplyApyBps)}
              totalSupply={{ tokens: formatCompactToken(vault.totalSupply), usd: formatCompactUsd(vault.suppliedUsd) }}
              available={{ tokens: formatCompactToken(vault.available), usd: formatCompactUsd(vault.availableUsd) }}
              utilization={formatPercent(vault.utilizationBps, 1)}
              yourSupply={
                vault.yourSupply
                  ? {
                      short: formatSummaryNumber(vault.yourSupply.amount, vault.symbol),
                      full: formatFullAmount(vault.yourSupply.amount, vault.symbol),
                      usd: formatUsd(vault.yourSupply.usd),
                    }
                  : undefined
              }
              onPress={() => onSelect(vault.id)}
            />
          ))}
        </View>
      )}
    </ResourceView>
  );
}
