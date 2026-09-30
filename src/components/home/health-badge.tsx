import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

const CENTER = 9;
const RADIUS = 7;
const DOMAIN = 1.5;

type HealthBadgeProps = {
  health: number;
};

export function HealthBadge({ health }: HealthBadgeProps) {
  const { colors } = useTheme();
  const fraction = Math.max(0.02, Math.min(1, (health - 1) / DOMAIN));
  const angle = Math.PI * (1 - fraction);
  const endX = CENTER + RADIUS * Math.cos(angle);
  const endY = CENTER - RADIUS * Math.sin(angle);

  return (
    <View accessibilityLabel={`Health ${health.toFixed(2)}`} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Svg width={18} height={12} viewBox="0 0 18 12">
        <Path d={`M2 ${CENTER} A${RADIUS} ${RADIUS} 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`} stroke={colors.heroPositive} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      </Svg>
      <AppText variant="bodyLg" color="onHeroMuted">
        {`Health ${health.toFixed(2)}`}
      </AppText>
    </View>
  );
}
