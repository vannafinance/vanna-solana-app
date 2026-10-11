import { View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Money } from "./money";

type HeroStatProps = {
  label: string;
  value: string;
  size?: "large" | "small";
  positive?: boolean;
};

export function HeroStat({ label, value, size = "small", positive = false }: HeroStatProps) {
  const { colors } = useTheme();
  const large = size === "large";

  return (
    <View style={{ gap: 2 }}>
      <AppText variant={large ? "bodyLg" : "label"} color="onHeroMuted">
        {label}
      </AppText>
      {large ? (
        <Money value={value} color="onHero" />
      ) : (
        <AppText variant="title" strong style={{ color: positive ? colors.heroPositive : colors.onHero }}>
          {value}
        </AppText>
      )}
    </View>
  );
}
