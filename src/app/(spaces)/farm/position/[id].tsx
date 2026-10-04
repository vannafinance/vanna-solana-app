import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PositionDetailHeader } from "@/components/farm/position-detail-header";
import { PositionDetailsCard } from "@/components/farm/position-details-card";
import { PositionOverview } from "@/components/farm/position-overview";
import { Button } from "@/components/ui/button";
import { ResourceView } from "@/components/ui/resource-view";
import { useFarmPosition } from "@/hooks/use-farm-position";
import type { FarmPositionView } from "@/types/farm";
import type { Resource } from "@/types/resource";
import { useTheme } from "@/theme/use-theme";

export default function FarmPositionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const live = useFarmPosition(id);
  // Closing repays the loan, so the position drops out of the live data while the success sheet is still on screen. The page
  // keeps the last position it showed until the sheet sends the user away, instead of flashing "Position not found".
  const [lastShown, setLastShown] = useState<FarmPositionView | null>(null);
  if (live.status === "ready" && live.data !== lastShown) setLastShown(live.data);
  const position: Resource<FarmPositionView> = live.status === "empty" && lastShown !== null ? { status: "ready", data: lastShown } : live;

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
