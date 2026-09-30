import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Money } from "@/components/ui/money";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

export type HeroMetric = { label: string; value: string; positive?: boolean };

type HeroMetricsProps = {
  primary: readonly HeroMetric[];
  secondary: readonly HeroMetric[];
  primaryAccessory?: ReactNode;
};

export function HeroMetrics({ primary, secondary, primaryAccessory }: HeroMetricsProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ marginTop: spacing.lg }}>
      <View style={{ flexDirection: "row", gap: spacing.xl }}>
        {primary.map((metric) => {
          const color: ThemeColor = metric.positive ? "heroPositive" : "onHero";
          return (
            <View key={metric.label} style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <AppText variant="bodyLg" color="onHeroMuted">
                  {metric.label}
                </AppText>
                {primaryAccessory}
              </View>
              <Money value={metric.value} color={color} />
            </View>
          );
        })}
      </View>
      <View style={{ height: 1, backgroundColor: colors.heroDivider, marginTop: spacing.lg }} />
      <View style={{ flexDirection: "row", marginTop: spacing.md }}>
        {secondary.map((metric, index) => (
          <View
            key={metric.label}
            style={{
              flex: 1,
              gap: 2,
              paddingLeft: index === 0 ? 0 : spacing.md,
              marginLeft: index === 0 ? 0 : spacing.md,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: colors.heroDivider,
            }}
          >
            <AppText variant="label" color="onHeroMuted">
              {metric.label}
            </AppText>
            <AppText variant="title" strong color={metric.positive ? "heroPositive" : "onHero"}>
              {metric.value}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
