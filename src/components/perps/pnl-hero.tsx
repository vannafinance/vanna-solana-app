import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { HeroStat } from "@/components/ui/hero-stat";
import { Money } from "@/components/ui/money";
import { useTheme } from "@/theme/use-theme";

import { HealthGauge } from "./health-gauge";

type PnlHeroProps = {
  label: string;
  value: string;
  positive: boolean;
  health: number;
  stats: readonly { label: string; value: string }[];
};

export function PnlHero({ label, value, positive, health, stats }: PnlHeroProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ marginTop: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="bodyLg" color="onHeroMuted">
          {label}
        </AppText>
        <HealthGauge health={health} />
      </View>
      <Money value={value} color={positive ? "heroPositive" : "short"} />
      <View
        style={{
          flexDirection: "row",
          marginTop: spacing.lg,
          paddingTop: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.heroDivider,
        }}
      >
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              paddingLeft: index === 0 ? 0 : spacing.md,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: colors.heroDivider,
            }}
          >
            <HeroStat label={stat.label} value={stat.value} />
          </View>
        ))}
      </View>
    </View>
  );
}
