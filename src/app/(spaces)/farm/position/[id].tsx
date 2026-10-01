import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PositionDetailHeader } from "@/components/farm/position-detail-header";
import { PositionDetailsCard } from "@/components/farm/position-details-card";
import { PositionOverview } from "@/components/farm/position-overview";
import { Button } from "@/components/ui/button";
import { ResourceView } from "@/components/ui/resource-view";
import { useFarmPosition } from "@/hooks/use-farm-position";
import { useTheme } from "@/theme/use-theme";

export default function FarmPositionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const position = useFarmPosition(id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <PositionDetailHeader onBack={() => router.back()} health={position.status === "ready" ? position.data.healthFactor : undefined} />
        <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 12 }}>
          <ResourceView resource={position} emptyLabel="Position not found">
            {(data) => (
              <>
                <PositionOverview position={data} />
                <PositionDetailsCard position={data} />
              </>
            )}
          </ResourceView>
        </View>
      </ScrollView>
      {position.status === "ready" ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 28), backgroundColor: colors.background }}>
          <Button variant="dark" label="Close position" onPress={() => router.push(`/farm/close/${id}`)} />
        </View>
      ) : null}
    </View>
  );
}
