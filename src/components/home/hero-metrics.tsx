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

function SecondaryMetric({ metric }: { metric: HeroMetric }) {
  const { colors } = useTheme();

  return (
    <View accessible accessibilityLabel={`${metric.label}, ${metric.value}`} style={{ gap: 2 }}>
      <AppText variant="caption" color="onHeroMuted">
        {metric.label}
      </AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {metric.dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.heroPositive }} /> : null}
        <AppText variant="bodyLg" strong numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} color={metric.positive ? "heroPositive" : "onHero"}>
          {metric.value}
        </AppText>
      </View>
    </View>
  );
}

// Up to three figures share one line, separated by thin rules.
function MetricRow({ metrics }: { metrics: readonly HeroMetric[] }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flexDirection: "row", gap: spacing.md }}>
      {metrics.map((metric, index) => (
        <View
          key={metric.label}
          style={{ flex: 1, paddingLeft: index === 0 ? 0 : spacing.md, borderLeftWidth: index === 0 ? 0 : 1, borderLeftColor: colors.heroRuleSoft }}
        >
          <SecondaryMetric metric={metric} />
        </View>
      ))}
    </View>
  );
}

// Four would truncate the dollar values on one line, so they sit in two columns read left to right, top to bottom, with a
// single rule between the columns.
function MetricGrid({ metrics }: { metrics: readonly HeroMetric[] }) {
  const { colors, spacing } = useTheme();
  const columns = [metrics.filter((_, index) => index % 2 === 0), metrics.filter((_, index) => index % 2 === 1)];

  return (
    <View style={{ flexDirection: "row", gap: spacing.md }}>
      {columns.map((column, index) => (
        <View
          key={column[0].label}
          style={{ flex: 1, gap: spacing.md, paddingLeft: index === 0 ? 0 : spacing.md, borderLeftWidth: index === 0 ? 0 : 1, borderLeftColor: colors.heroRuleSoft }}
        >
          {column.map((metric) => (
            <SecondaryMetric key={metric.label} metric={metric} />
          ))}
        </View>
      ))}
    </View>
  );
}

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
      <View style={{ marginTop: 20, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.heroRule }}>
        {secondary.length > 3 ? <MetricGrid metrics={secondary} /> : <MetricRow metrics={secondary} />}
      </View>
    </View>
  );
}
