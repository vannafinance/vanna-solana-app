import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { AppText } from "@/components/ui/app-text";
import { health as healthThresholds } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

import { formatHealth } from "@/format/format-perps";

const RADIUS = 7;
const CENTER = 9;
const SPAN = 1.5;

type HealthGaugeProps = { health: number };

function arcEnd(health: number) {
  const fill = Math.max(0.02, Math.min(1, (health - 1) / SPAN));
  const angle = Math.PI * (1 - fill);
  return `${(CENTER + RADIUS * Math.cos(angle)).toFixed(2)} ${(CENTER - RADIUS * Math.sin(angle)).toFixed(2)}`;
}

export function HealthGauge({ health }: HealthGaugeProps) {
  const { colors } = useTheme();
  const stroke = health >= healthThresholds.safeFrom ? colors.heroPositive : colors.short;

  return (
    <View accessible accessibilityLabel={`Account health ${formatHealth(health)}`} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Svg width={18} height={10} viewBox="0 0 18 10">
        <Path d="M2 9 A7 7 0 0 1 16 9" fill="none" stroke={colors.heroDivider} strokeWidth={2.5} strokeLinecap="round" />
        <Path d={`M2 9 A7 7 0 0 1 ${arcEnd(health)}`} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
      <AppText variant="caption" color="onHeroMuted">{`Health ${formatHealth(health)}`}</AppText>
    </View>
  );
}
