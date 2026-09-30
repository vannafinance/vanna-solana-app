import { Plant, Plus } from "phosphor-react-native";
import { router } from "expo-router";
import { FlatList, Pressable, View } from "react-native";

import { FarmHero } from "@/components/farm/farm-hero";
import { FarmPositionCard } from "@/components/farm/farm-position-card";
import { AppText } from "@/components/ui/app-text";
import { ProductHeader } from "@/components/ui/product-header";
import { ResourceView } from "@/components/ui/resource-view";
import { formatPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useFarmPositions } from "@/hooks/use-farm-positions";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useTheme } from "@/theme/use-theme";

export default function FarmPositionsScreen() {
  const { colors, radius, spacing } = useTheme();
  const headerProps = useHeaderProps();
  const positions = useFarmPositions();
  const items = positions.status === "ready" ? positions.data.positions : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={items}
        keyExtractor={(position) => position.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <ProductHeader product="farm" title="Farm" icon={Plant} onBack={() => router.back()} {...headerProps}>
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
              ) : null}
            </ProductHeader>
          </View>
        }
        ListEmptyComponent={
          <ResourceView resource={positions} emptyLabel="No open farm positions">
            {() => null}
          </ResourceView>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <FarmPositionCard position={item} onPress={() => router.push(`/farm/position/${item.id}`)} />
          </View>
        )}
        ListFooterComponent={
          positions.status === "loading" || positions.status === "error" ? null : (
            <View style={{ padding: spacing.lg }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Deploy another strategy"
                onPress={() => router.navigate("/farm")}
                style={{
                  minHeight: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing.sm,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: colors.border,
                }}
              >
                <Plus size={18} color={colors.text} />
                <AppText variant="body" strong>
                  {positions.status === "empty" ? "Deploy a strategy" : "Deploy another strategy"}
                </AppText>
              </Pressable>
            </View>
          )
        }
      />
    </View>
  );
}
