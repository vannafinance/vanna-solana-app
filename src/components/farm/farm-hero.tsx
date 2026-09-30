import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { HeroStat } from "@/components/ui/hero-stat";
import { useTheme } from "@/theme/use-theme";

type FarmHeroStat = { label: string; value: string };

type FarmHeroProps = {
  label: string;
  value: string;
  stats: readonly FarmHeroStat[];
};

export function FarmHero({ label, value, stats }: FarmHeroProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ marginTop: spacing.xl }}>
      <AppText variant="body" color="onHeroMuted">
        {label}
      </AppText>
      <AppText variant="display" color="onHero" accessibilityLabel={`${label} ${value}`}>
        {value}
      </AppText>
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
              paddingLeft: index > 0 ? spacing.lg : 0,
              borderLeftWidth: index > 0 ? 1 : 0,
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
