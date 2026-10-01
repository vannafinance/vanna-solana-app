import { FlatList, View } from "react-native";

import { FarmHero } from "@/components/farm/farm-hero";
import { FarmHistoryCard } from "@/components/farm/farm-history-card";
import { ResourceView } from "@/components/ui/resource-view";
import { SpaceHeader } from "@/components/ui/space-header";
import { formatSignedUsd } from "@/format/format-amount";
import { useFarmHistory } from "@/hooks/use-farm-history";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useTheme } from "@/theme/use-theme";

export default function FarmHistoryScreen() {
  const { colors } = useTheme();
  const headerProps = useHeaderProps();
  const { history, openTransaction } = useFarmHistory();
  const entries = history.status === "ready" ? history.data.entries : [];

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={entries}
      keyExtractor={(entry) => entry.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <SpaceHeader space="farm" {...headerProps}>
            {history.status === "ready" ? (
              <FarmHero
                label="Earned from farms"
                value={formatSignedUsd(history.data.earnedUsd)}
                stats={[
                  { label: "Closed", value: String(history.data.closedCount) },
                  { label: "Open", value: String(history.data.openCount) },
                ]}
              />
            ) : undefined}
          </SpaceHeader>
        </View>
      }
      ListEmptyComponent={
        <ResourceView resource={history} emptyLabel="No farm activity yet">
          {() => null}
        </ResourceView>
      }
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 16 }}>
          <FarmHistoryCard entry={item} onOpenTransaction={() => openTransaction(item.signature)} />
        </View>
      )}
    />
  );
}
