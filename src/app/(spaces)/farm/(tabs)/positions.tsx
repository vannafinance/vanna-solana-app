import { router } from "expo-router";
import { FlatList, Pressable, View } from "react-native";

import { FarmHero } from "@/components/farm/farm-hero";
import { FarmPositionCard } from "@/components/farm/farm-position-card";
import { UnplacedPositionCard } from "@/components/farm/unplaced-position-card";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ResourceView } from "@/components/ui/resource-view";
import { SpaceHeader } from "@/components/ui/space-header";
import { formatPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import { unplacedCloseId } from "@/hooks/use-farm-close";
import { useFarmPositions } from "@/hooks/use-farm-positions";
import { useHeaderProps } from "@/hooks/use-header-props";
import { spaceRoutes } from "@/navigation/routes";
import { useTheme } from "@/theme/use-theme";

export default function FarmPositionsScreen() {
  const { colors, radius } = useTheme();
  const headerProps = useHeaderProps();
  const positions = useFarmPositions();
  const items = positions.status === "ready" ? positions.data.positions : [];
  const unplaced = positions.status === "ready" ? positions.data.unplaced : [];
  const settled = positions.status === "ready" || positions.status === "empty";

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={items}
      keyExtractor={(position) => position.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <SpaceHeader space="farm" {...headerProps}>
            {positions.status === "ready" ? (
              <FarmHero
                label="Farm net value"
                value={formatUsd(positions.data.netValueUsd)}
                stats={[
                  { label: "Open positions", value: String(positions.data.positions.length) },
                  { label: "Earnings", value: formatSignedUsd(positions.data.earningsUsd) },
                  { label: "Net APR", value: formatPercent(positions.data.netAprBps) },
                ]}
              />
            ) : undefined}
          </SpaceHeader>
        </View>
      }
      ListEmptyComponent={
        <ResourceView resource={positions} emptyLabel="No open farm positions">
          {() => null}
        </ResourceView>
      }
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 16 }}>
          <FarmPositionCard position={item} onPress={() => router.push(`/farm/position/${item.id}`)} />
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
              accessibilityLabel={positions.status === "empty" ? "Deploy a strategy" : "Deploy another strategy"}
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
                {positions.status === "empty" ? "Deploy a strategy" : "Deploy another strategy"}
              </AppText>
            </Pressable>
          </View>
        ) : null
      }
    />
  );
}
