import { FlatList, View } from "react-native";

import { FarmHistoryCard } from "@/components/farm/farm-history-card";
import { MarginHero } from "@/components/margin/margin-hero";
import { ResourceView } from "@/components/ui/resource-view";
import { SpaceHeader } from "@/components/ui/space-header";
import { useFarmHistory } from "@/hooks/use-farm-history";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useMarginOverview } from "@/hooks/use-margin-overview";
import { useResetScrollBetweenSpaces } from "@/navigation/use-reset-scroll-between-spaces";
import { useTheme } from "@/theme/use-theme";

export default function FarmHistoryScreen() {
  const listRef = useResetScrollBetweenSpaces();
  const { colors } = useTheme();
  const headerProps = useHeaderProps();
  const margin = useMarginOverview();
  const { history, openTransaction } = useFarmHistory();
  const entries = history.status === "ready" ? history.data.entries : [];

  return (
    <FlatList
      ref={listRef}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.background }}
      data={entries}
      keyExtractor={(entry) => entry.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <SpaceHeader space="farm" {...headerProps}>
            <MarginHero module="farm" overview={margin} />
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
