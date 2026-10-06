import { View } from "react-native";

import { Card } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { FarmPositionView } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { withSymbol } from "./farm-format";

type PositionDetailsCardProps = {
  position: FarmPositionView;
};

// The figures behind the summary above: what the position is worth net, and how its debt and yield have grown.
export function PositionDetailsCard({ position }: PositionDetailsCardProps) {
  const { spacing } = useTheme();
  const pool = position.poolSymbol;

  return (
    <Card padded={false} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs }}>
      <View style={{ paddingBottom: spacing.xs }}>
        <CapsLabel>POSITION DETAILS</CapsLabel>
      </View>
      <DetailRow label="Net value" value={formatUsd(position.netValueUsd)} />
      <DetailRow label="Borrowed" value={withSymbol(position.principal, pool)} />
      <DetailRow label="Interest accrued" value={`+${withSymbol(position.interest, pool)}`} />
      <DetailRow label="Kamino yield earned" value={`+${withSymbol(position.yieldEarned, pool)}`} valueColor="positive" last />
    </Card>
  );
}
