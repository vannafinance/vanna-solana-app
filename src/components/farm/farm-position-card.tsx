import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/theme/use-theme";
import type { FarmPositionView } from "@/types/farm";

import { healthText, pairLabel } from "./farm-format";
import { PositionSummary } from "./position-summary";

type FarmPositionCardProps = {
  position: FarmPositionView;
  onDetails: () => void;
  onClose: () => void;
};

// One farm position, with this position's own figures only. The margin account's figures are in the header above.
export function FarmPositionCard({ position, onDetails, onClose }: FarmPositionCardProps) {
  const { spacing } = useTheme();
  const health = Number.isFinite(position.healthFactor) ? position.healthFactor : null;

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${pairLabel(position.collateralSymbol, position.poolSymbol)} farm position, position health ${healthText(health)}. Open details`}
          onPress={onDetails}
        >
          <PositionSummary position={position} />
        </Pressable>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button size="sm" variant="outline" flex label="Details" onPress={onDetails} />
          <Button size="sm" variant="dark" flex label="Close" onPress={onClose} />
        </View>
      </View>
    </Card>
  );
}
