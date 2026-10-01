import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

export type Stat = { label: string; value: string; sub?: string; color?: ThemeColor };

type StatPanelProps = {
  stats: readonly Stat[];
};

export function StatPanel({ stats }: StatPanelProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.background }}>
      {stats.map((stat) => (
        <View key={stat.label} style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color="textMuted">
            {stat.label}
          </AppText>
          <AppText variant="body" strong color={stat.color}>
            {stat.value}
          </AppText>
          {stat.sub ? (
            <AppText variant="caption" color="textMuted">
              {stat.sub}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}
