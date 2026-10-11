import { router } from "expo-router";
import { FlatList, Pressable, View } from "react-native";

import { FarmOverviewCard, FarmOverviewEmpty } from "@/components/farm/farm-overview-card";
import { FarmPositionCard } from "@/components/farm/farm-position-card";
import { UnplacedPositionCard } from "@/components/farm/unplaced-position-card";
import { MarginHero } from "@/components/margin/margin-hero";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ResourceView } from "@/components/ui/resource-view";
import { SpaceHeader } from "@/components/ui/space-header";
import { unplacedCloseId } from "@/hooks/use-farm-close";
import { useFarmOverview } from "@/hooks/use-farm-overview";
import { useFarmPositions } from "@/hooks/use-farm-positions";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useMarginOverview } from "@/hooks/use-margin-overview";
import { spaceRoutes } from "@/navigation/routes";
import { useResetScrollBetweenSpaces } from "@/navigation/use-reset-scroll-between-spaces";
import { useTheme } from "@/theme/use-theme";

// The header is the whole margin account. Under it, net earnings over time and the interest the loans have accrued, then
// each farm position with its own figures.
export default function FarmPositionsScreen() {
  const listRef = useResetScrollBetweenSpaces();
  const { colors, radius } = useTheme();
  const headerProps = useHeaderProps();
  const margin = useMarginOverview();
  const positions = useFarmPositions();
  const { overview, mode, setMode, range, setRange } = useFarmOverview();
  const items = positions.status === "ready" ? positions.data.positions : [];
  const unplaced = positions.status === "ready" ? positions.data.unplaced : [];
  const settled = positions.status === "ready" || positions.status === "empty";
  const deployLabel = positions.status === "empty" ? "Deploy a strategy" : "Deploy another strategy";

  return (
    <FlatList
      ref={listRef}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.background }}
      data={items}
      keyExtractor={(position) => position.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={{ gap: 16, marginBottom: 12 }}>
          <SpaceHeader space="farm" {...headerProps}>
            <MarginHero module="farm" overview={margin} />
          </SpaceHeader>
          {overview.status === "ready" ? (
            <View style={{ paddingHorizontal: 16 }}>
              <FarmOverviewCard overview={overview.data} mode={mode} onModeChange={setMode} range={range} onRangeChange={setRange} />
            </View>
          ) : overview.status === "empty" ? (
            <View style={{ paddingHorizontal: 16 }}>
              <FarmOverviewEmpty />
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        // With no farm and no history the card above already says so.
        overview.status === "empty" ? null : (
          <ResourceView resource={positions} emptyLabel="No open farm positions">
            {() => null}
          </ResourceView>
        )
      }
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 16 }}>
          <FarmPositionCard position={item} onDetails={() => router.push(`/farm/position/${item.id}`)} onClose={() => router.push(`/farm/close/${item.id}`)} />
        </View>
      )}
      ListFooterComponent={
        settled ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
            {unplaced.map((position) => (
              <UnplacedPositionCard key={position.pool} position={position} onPress={() => router.push(`/farm/close/${unplacedCloseId(position.pool)}`)} />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={deployLabel}
              onPress={() => router.navigate(spaceRoutes.farm)}
              style={{
                height: 52,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: radius.md,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: colors.border,
              }}
            >
              <Icon name="add" size={18} color="text" />
              <AppText variant="body" strong>
                {deployLabel}
              </AppText>
            </Pressable>
          </View>
        ) : null
      }
    />
  );
}
