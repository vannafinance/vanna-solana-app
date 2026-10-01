import type { ReactNode } from "react";
import { FlatList, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";
import type { SwapHistoryGroup } from "@/types/swap";

import { SwapHistoryRow } from "./swap-history-row";

type SwapHistoryListProps = {
  header: ReactNode;
  groups: readonly SwapHistoryGroup[];
};

export function SwapHistoryList({ header, groups }: SwapHistoryListProps) {
  const { colors } = useTheme();

  return (
    <FlatList
      data={groups}
      keyExtractor={(group) => group.day}
      ListHeaderComponent={<>{header}</>}
      ListEmptyComponent={
        <AppText color="textMuted" style={{ textAlign: "center", padding: 24 }}>
          No swaps yet
        </AppText>
      }
      ListFooterComponent={
        groups.length === 0 ? null : (
          <View style={{ height: 40, alignItems: "center", justifyContent: "center" }}>
            <AppText variant="caption" color="textMuted">
              Showing the last 30 days
            </AppText>
          </View>
        )
      }
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <SwapHistoryRow group={item} />
        </View>
      )}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    />
  );
}
