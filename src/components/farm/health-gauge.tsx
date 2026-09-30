import Svg, { Path } from "react-native-svg";

import { useTheme } from "@/theme/use-theme";

import { healthColor } from "./farm-format";

type HealthGaugeProps = {
  health: number;
  width?: number;
};

const ARC_RADIUS = 7;
const ARC_CENTER = 9;
const HEALTH_SPAN = 1.5;

export function HealthGauge({ health, width = 18 }: HealthGaugeProps) {
  const { colors } = useTheme();
  const fraction = Math.max(0.02, Math.min(1, (health - 1) / HEALTH_SPAN));
  const angle = Math.PI * (1 - fraction);
  const endX = (ARC_CENTER + ARC_RADIUS * Math.cos(angle)).toFixed(2);
  const endY = (ARC_CENTER - ARC_RADIUS * Math.sin(angle)).toFixed(2);

  return (
    <Svg width={width} height={(width * 10) / 18} viewBox="0 0 18 10" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M2 9 A7 7 0 0 1 16 9" fill="none" stroke={colors.divider} strokeWidth={2.5} strokeLinecap="round" />
      <Path d={`M2 9 A7 7 0 0 1 ${endX} ${endY}`} fill="none" stroke={colors[healthColor(health)]} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}
