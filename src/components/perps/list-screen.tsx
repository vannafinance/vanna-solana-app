import type { ReactElement, ReactNode } from "react";
import { FlatList, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

type ListScreenProps<T> = {
  data: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  header: ReactNode;
  footer?: ReactNode;
  empty?: ReactNode;
  itemGap?: number;
};

export function ListScreen<T>({ data, keyOf, renderItem, header, footer, empty, itemGap }: ListScreenProps<T>) {
  const { colors, spacing } = useTheme();
  const gap = itemGap ?? spacing.lg;

  return (
    <FlatList
      data={data}
      keyExtractor={keyOf}
      renderItem={({ item }) => <View style={{ paddingHorizontal: spacing.lg, paddingTop: gap }}>{renderItem(item)}</View>}
      ListHeaderComponent={<>{header}</>}
      ListEmptyComponent={<View style={{ padding: spacing.lg }}>{empty}</View>}
      ListFooterComponent={<View style={{ padding: spacing.lg }}>{footer}</View>}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
    />
  );
}
