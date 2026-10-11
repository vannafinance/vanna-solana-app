import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { HealthGauge } from "@/components/ui/health-gauge";
import { health as thresholds } from "@/theme/tokens";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

const legend: readonly { label: string; color: ThemeColor }[] = [
  { label: `Below ${thresholds.liquidation.toFixed(2)}`, color: "coral" },
  { label: `${thresholds.liquidation.toFixed(2)} to ${thresholds.safeFrom.toFixed(2)}`, color: "healthWatch" },
  { label: `Above ${thresholds.safeFrom.toFixed(2)}`, color: "positive" },
];

// The account-health gauge with its three-band legend. Portfolio's Margin account card leads with it; any other screen that
// shows the account's health uses this same block, so it reads the same wherever it appears.
export function AccountHealth({ health, size = "regular" }: { health: number; size?: "regular" | "compact" }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <HealthGauge value={health} size={size} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.lg }}>
        {legend.map((item) => (
          <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: colors[item.color] }} />
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
