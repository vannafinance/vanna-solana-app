import type { ReactNode } from "react";
import { FlatList, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useResetScrollBetweenSpaces } from "@/navigation/use-reset-scroll-between-spaces";
import { useTheme } from "@/theme/use-theme";
import type { SwapHistoryGroup } from "@/types/swap";

import { SwapHistoryRow } from "./swap-history-row";

type SwapHistoryListProps = {
  header: ReactNode;
  groups: readonly SwapHistoryGroup[];
  onOpenTransaction: (signature: string) => void;
};

export function SwapHistoryList({ header, groups, onOpenTransaction }: SwapHistoryListProps) {
  const { colors } = useTheme();
  const listRef = useResetScrollBetweenSpaces();

  return (
    <FlatList
      ref={listRef}
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
          <SwapHistoryRow group={item} onOpenTransaction={onOpenTransaction} />
        </View>
      )}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    />
  );
}
