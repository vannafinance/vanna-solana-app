import { View } from "react-native";

import { StatPanel } from "@/components/home/stat-panel";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/format/format-amount";
import { health as thresholds } from "@/theme/tokens";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

import { HealthGauge } from "./health-gauge";

type AccountHealthCardProps = {
  health: number;
  leverage: number | null;
  roomBeforeLiquidation: bigint;
  netAvailable: bigint;
  collateral: bigint;
  debt: bigint;
};

const legend: readonly { label: string; color: ThemeColor }[] = [
  { label: `Below ${thresholds.liquidation.toFixed(2)}`, color: "negative" },
  { label: `${thresholds.liquidation.toFixed(2)} to ${thresholds.safeFrom.toFixed(2)}`, color: "warning" },
  { label: `Above ${thresholds.safeFrom.toFixed(2)}`, color: "positive" },
];

export function AccountHealthCard({ health, leverage, roomBeforeLiquidation, netAvailable, collateral, debt }: AccountHealthCardProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText variant="body" strong color="textMuted">
          Account health
        </AppText>
        <AppText variant="body" color="textMuted">{`Liquidation at ${thresholds.liquidation.toFixed(2)}`}</AppText>
      </View>
      <HealthGauge value={health} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.lg }}>
        {legend.map((item) => (
          <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 12, height: 4, borderRadius: radius.pill, backgroundColor: colors[item.color] }} />
            <AppText variant="body" color="textMuted">
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
      <StatPanel
        stats={[
          { label: "Room before liquidation", value: formatUsd(roomBeforeLiquidation) },
          { label: "Net available collateral", value: formatUsd(netAvailable) },
          { label: "Leverage taken", value: leverage === null ? "None" : `${leverage.toFixed(2)}x` },
        ]}
      />
      <AppText variant="body" color="textMuted">
        {`Health = collateral ${formatUsd(collateral)} ÷ debt ${formatUsd(debt)}. If it reaches ${thresholds.liquidation.toFixed(2)}, the risk engine liquidates.`}
      </AppText>
    </Card>
  );
}
