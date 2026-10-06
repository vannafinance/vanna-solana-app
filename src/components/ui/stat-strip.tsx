import { View } from "react-native";

import { type ThemeColor, useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

export type StripStat = { label: string; value: string; sub?: string; valueColor?: ThemeColor };

// The one way a card shows a group of figures: a tinted strip of equal columns, label over value (over an optional small
// line), split by hairlines. Two or three figures sit in one row; four sit in two rows of two. Use this instead of a line of
// figures joined with dots.
export function StatStrip({ stats }: { stats: readonly StripStat[] }) {
  const { colors, radius, spacing } = useTheme();
  const rows = stats.length === 4 ? [stats.slice(0, 2), stats.slice(2)] : [stats];

  return (
    <View style={{ borderRadius: radius.sm, backgroundColor: colors.background, paddingHorizontal: spacing.md }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", paddingVertical: spacing.md, borderTopWidth: rowIndex === 0 ? 0 : 1, borderTopColor: colors.divider }}>
          {row.map((stat, index) => (
            <View
              key={stat.label}
              accessible
              accessibilityLabel={`${stat.label}, ${stat.value}${stat.sub ? `, ${stat.sub}` : ""}`}
              style={{ flex: 1, gap: 2, paddingLeft: index === 0 ? 0 : spacing.md, marginLeft: index === 0 ? 0 : spacing.md - 1, borderLeftWidth: index === 0 ? 0 : 1, borderLeftColor: colors.divider }}
            >
              <AppText variant="caption" color="textMuted" numberOfLines={1}>
                {stat.label}
              </AppText>
              <AppText variant="body" strong color={stat.valueColor ?? "text"} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {stat.value}
              </AppText>
              {stat.sub ? (
                <AppText variant="caption" color="textMuted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {stat.sub}
                </AppText>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
