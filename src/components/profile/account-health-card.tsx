import { View } from "react-native";

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
  { label: `Below ${thresholds.liquidation.toFixed(2)}`, color: "coral" },
  { label: `${thresholds.liquidation.toFixed(2)} to ${thresholds.safeFrom.toFixed(2)}`, color: "healthWatch" },
  { label: `Above ${thresholds.safeFrom.toFixed(2)}`, color: "positive" },
];

export function AccountHealthCard({ health, leverage, roomBeforeLiquidation, netAvailable, collateral, debt }: AccountHealthCardProps) {
  const { colors, radius, spacing } = useTheme();
  const facts = [
    { label: "Room before liquidation", value: formatUsd(roomBeforeLiquidation) },
    { label: "Net available collateral", value: formatUsd(netAvailable) },
    { label: "Leverage taken", value: leverage === null ? "None" : `${leverage.toFixed(2)}x` },
  ];

  return (
    <Card padded={false} style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
      <View style={{ height: 44, justifyContent: "center" }}>
        <AppText variant="caption" strong color="textMuted">
          Account health
        </AppText>
      </View>
      <View style={{ paddingTop: spacing.xs, paddingBottom: spacing.sm }}>
        <HealthGauge value={health} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.lg }}>
        {legend.map((item) => (
          <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: colors[item.color] }} />
            <AppText variant="caption" color="textMuted">
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
      <View style={{ marginTop: spacing.lg, flexDirection: "row", padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.background }}>
        {facts.map((fact, index) => (
          <View
            key={fact.label}
            style={{
              flex: 1,
              gap: 2,
              paddingLeft: index === 0 ? 0 : spacing.md,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: colors.divider,
            }}
          >
            <AppText variant="caption" color="textMuted">
              {fact.label}
            </AppText>
            <AppText variant="body" strong>
              {fact.value}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.md, lineHeight: 18 }}>
        {`Health = collateral ${formatUsd(collateral)} ÷ debt ${formatUsd(debt)}.`}
      </AppText>
    </Card>
  );
}
