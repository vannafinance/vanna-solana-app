import type { ReactNode } from "react";
import { FlatList, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ResourceView } from "@/components/ui/resource-view";
import { formatCompactUsd, formatPercent } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { VaultSummary } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { formatSummaryNumber } from "@/format/format-earn";
import { VaultRow } from "./vault-row";

type EarnVaultListProps = {
  header: ReactNode;
  vaults: Resource<readonly VaultSummary[]>;
  emptyLabel: string;
  onSelect: (id: string) => void;
};

export function EarnVaultList({ header, vaults, emptyLabel, onSelect }: EarnVaultListProps) {
  const { colors, radius, spacing } = useTheme();
  const data = vaults.status === "ready" ? vaults.data : [];

  return (
    <FlatList
      data={data}
      keyExtractor={(vault) => vault.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      ListHeaderComponent={
        <>
          {header}
          {data.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                height: 40,
                marginHorizontal: spacing.lg,
                paddingHorizontal: spacing.lg,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
                backgroundColor: colors.surface,
              }}
            >
              <AppText variant="caption" color="textMuted">
                Vault
              </AppText>
              <AppText variant="caption" color="textMuted">
                Supply APY
              </AppText>
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <ResourceView resource={vaults} emptyLabel={emptyLabel}>
          {() => null}
        </ResourceView>
      }
      renderItem={({ item, index }) => (
        <View
          style={{
            marginHorizontal: spacing.lg,
            paddingHorizontal: spacing.lg,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.divider,
            borderBottomLeftRadius: index === data.length - 1 ? radius.lg : 0,
            borderBottomRightRadius: index === data.length - 1 ? radius.lg : 0,
          }}
        >
          <VaultRow
            symbol={item.symbol}
            supplied={formatCompactUsd(item.suppliedUsd)}
            borrowed={formatCompactUsd(item.borrowedUsd)}
            apy={formatPercent(item.supplyApyBps)}
            yourSupply={item.yourSupply ? formatSummaryNumber(item.yourSupply, item.symbol) : undefined}
            onPress={() => onSelect(item.id)}
          />
        </View>
      )}
    />
  );
}
