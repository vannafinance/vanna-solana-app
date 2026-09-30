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
    <View style={{ flexDirection: "row", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background }}>
      {stats.map((stat) => (
        <View key={stat.label} style={{ flex: 1 }}>
          <AppText variant="body" color="textMuted">
            {stat.label}
          </AppText>
          <AppText variant="bodyLg" strong color={stat.color}>
            {stat.value}
          </AppText>
          {stat.sub ? (
            <AppText variant="body" color="textMuted">
              {stat.sub}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}
