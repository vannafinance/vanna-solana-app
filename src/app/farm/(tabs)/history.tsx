import { Plant } from "phosphor-react-native";
import { router } from "expo-router";
import { FlatList, View } from "react-native";

import { FarmHero } from "@/components/farm/farm-hero";
import { FarmHistoryCard } from "@/components/farm/farm-history-card";
import { ProductHeader } from "@/components/ui/product-header";
import { ResourceView } from "@/components/ui/resource-view";
import { formatSignedUsd } from "@/format/format-amount";
import { useFarmHistory } from "@/hooks/use-farm-history";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useTheme } from "@/theme/use-theme";

export default function FarmHistoryScreen() {
  const { colors, spacing } = useTheme();
  const headerProps = useHeaderProps();
  const { history, openTransaction } = useFarmHistory();
  const entries = history.status === "ready" ? history.data.entries : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <ProductHeader product="farm" title="Farm" icon={Plant} onBack={() => router.back()} {...headerProps}>
              {history.status === "ready" ? (
                <FarmHero
                  label="Earned from farms"
                  value={formatSignedUsd(history.data.earnedUsd)}
                  stats={[
                    { label: "Closed", value: String(history.data.closedCount) },
                    { label: "Open", value: String(history.data.openCount) },
                  ]}
                />
              ) : null}
            </ProductHeader>
          </View>
        }
        ListEmptyComponent={
          <ResourceView resource={history} emptyLabel="No farm activity yet">
            {() => null}
          </ResourceView>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <FarmHistoryCard entry={item} onOpenTransaction={() => openTransaction(item.signature)} />
          </View>
        )}
      />
    </View>
  );
}
