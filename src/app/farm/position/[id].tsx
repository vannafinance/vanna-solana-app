import { router, useLocalSearchParams } from "expo-router";

import { PositionDetailHeader } from "@/components/farm/position-detail-header";
import { PositionDetailsCard } from "@/components/farm/position-details-card";
import { PositionOverview } from "@/components/farm/position-overview";
import { Button } from "@/components/ui/button";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { useFarmPosition } from "@/hooks/use-farm-position";

export default function FarmPositionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const position = useFarmPosition(id);

  return (
    <Screen
      header={
        <PositionDetailHeader
          onBack={() => router.back()}
          health={position.status === "ready" ? position.data.healthFactor : undefined}
        />
      }
      footer={
        position.status === "ready" ? (
          <Button variant="dark" label="Close position" onPress={() => router.push(`/farm/close/${id}`)} />
        ) : null
      }
    >
      <ResourceView resource={position} emptyLabel="Position not found">
        {(data) => (
          <>
            <PositionOverview position={data} />
            <PositionDetailsCard position={data} />
          </>
        )}
      </ResourceView>
    </Screen>
  );
}
