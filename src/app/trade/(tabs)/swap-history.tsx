import { ArrowsLeftRight } from "phosphor-react-native";
import { FlatList, View } from "react-native";
import { router } from "expo-router";

import { SwapHistoryRow } from "@/components/swap/swap-history-row";
import { AppText } from "@/components/ui/app-text";
import { HeroStat } from "@/components/ui/hero-stat";
import { ProductHeader } from "@/components/ui/product-header";
import { ResourceView } from "@/components/ui/resource-view";
import { formatUsd } from "@/format/format-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useSwapHistory } from "@/hooks/use-swap-history";
import { useTheme } from "@/theme/use-theme";

export default function SwapHistoryScreen() {
  const { colors, spacing } = useTheme();
  const headerProps = useHeaderProps();
  const history = useSwapHistory();

  const header = (volume: string | null) => (
    <ProductHeader product="swap" title="Swap" icon={ArrowsLeftRight} onBack={() => router.back()} {...headerProps}>
      {volume ? (
        <View style={{ marginTop: spacing.lg }}>
          <HeroStat size="large" label="Swapped in the last 30 days" value={volume} />
        </View>
      ) : null}
    </ProductHeader>
  );

  if (history.status !== "ready") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {header(null)}
        <ResourceView resource={history} emptyLabel="No swaps yet">
          {() => null}
        </ResourceView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={history.data.groups}
        keyExtractor={(group) => group.day}
        ListHeaderComponent={header(formatUsd(history.data.volumeUsd))}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <SwapHistoryRow group={item} />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponentStyle={{ marginBottom: spacing.lg }}
        ListFooterComponent={
          <AppText variant="bodyLg" color="textMuted" style={{ textAlign: "center", paddingTop: spacing.lg }}>
            Showing the last 30 days
          </AppText>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
