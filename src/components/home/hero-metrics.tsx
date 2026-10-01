import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Money } from "@/components/ui/money";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

export type HeroMetric = { label: string; value: string; positive?: boolean; dot?: boolean; plain?: boolean };

type HeroMetricsProps = {
  primary: readonly HeroMetric[];
  secondary: readonly HeroMetric[];
  size?: "regular" | "large";
  accessory?: ReactNode;
};

const VALUE_STYLE = {
  regular: { fontSize: 30, lineHeight: 38, letterSpacing: -0.6 },
  large: { fontSize: 40, lineHeight: 48, letterSpacing: -0.8 },
} as const;

export function HeroMetrics({ primary, secondary, size = "regular", accessory }: HeroMetricsProps) {
  const { colors, spacing } = useTheme();
  const valueStyle = VALUE_STYLE[size];

  return (
    <View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        {primary.map((metric) => {
          const color: ThemeColor = metric.positive ? "heroPositive" : "onHero";
          return (
            <View key={metric.label} style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
                <AppText variant="body" color="onHeroSoft">
                  {metric.label}
                </AppText>
                {accessory}
              </View>
              {metric.plain ? (
                <AppText variant="display" color={color} style={valueStyle}>
                  {metric.value}
                </AppText>
              ) : (
                <Money value={metric.value} color={color} style={valueStyle} />
              )}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: 20, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.heroRule }}>
        {secondary.map((metric, index) => (
          <View
            key={metric.label}
            style={{
              flex: 1,
              gap: 2,
              paddingLeft: index === 0 ? 0 : spacing.md,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: colors.heroRuleSoft,
            }}
          >
            <AppText variant="caption" color="onHeroMuted">
              {metric.label}
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {metric.dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.heroPositive }} /> : null}
              <AppText variant="bodyLg" strong numberOfLines={1} color={metric.positive ? "heroPositive" : "onHero"}>
                {metric.value}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
