import type { ReactNode } from "react";
import { FlatList, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";
import type { MarginActivity } from "@/types/margin-history";

import { ActivityCard } from "./activity-card";

type ActivityListProps = {
  header: ReactNode;
  entries: readonly MarginActivity[];
  emptyLabel: string;
  onOpenTransaction: (signature: string) => void;
};

export function ActivityList({ header, entries, emptyLabel, onOpenTransaction }: ActivityListProps) {
  const { colors, spacing } = useTheme();

  return (
    <FlatList
      data={entries}
      keyExtractor={(entry) => entry.signature}
      ListHeaderComponent={<>{header}</>}
      ListEmptyComponent={
        <AppText color="textMuted" style={{ textAlign: "center", padding: spacing.xl }}>
          {emptyLabel}
        </AppText>
      }
      renderItem={({ item }) => (
        <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
          <ActivityCard entry={item} onOpenTransaction={onOpenTransaction} />
        </View>
      )}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
    />
  );
}
