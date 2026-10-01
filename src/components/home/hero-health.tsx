import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

import { HealthArc } from "./health-arc";

type HeroHealthProps = {
  health: number;
};

export function HeroHealth({ health }: HeroHealthProps) {
  const { colors } = useTheme();

  return (
    <View accessibilityLabel={`Health ${health.toFixed(2)}`} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <HealthArc health={health} width={18} height={10} track={colors.onHeroSoft} fill={colors.heroPositive} />
      <AppText variant="caption" color="onHeroSoft">
        {`Health ${health.toFixed(2)}`}
      </AppText>
    </View>
  );
}
