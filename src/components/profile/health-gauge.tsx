import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { AppText } from "@/components/ui/app-text";
import { health as thresholds } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

const WIDTH = 240;
const HEIGHT = 136;
const CENTER_X = WIDTH / 2;
const CENTER_Y = 120;
const RADIUS = 100;
const STROKE = 18;
const MIN = 1;
const MAX = 2.5;
const GAP = 0.006;

const fractionOf = (value: number) => Math.max(0, Math.min(1, (value - MIN) / (MAX - MIN)));

function pointAt(fraction: number) {
  const angle = Math.PI * (1 - fraction);
  return { x: CENTER_X + RADIUS * Math.cos(angle), y: CENTER_Y - RADIUS * Math.sin(angle) };
}

function arc(from: number, to: number) {
  const start = pointAt(from);
  const end = pointAt(to);
  return `M${start.x.toFixed(2)} ${start.y.toFixed(2)} A${RADIUS} ${RADIUS} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function statusOf(value: number) {
  if (value >= thresholds.safeFrom) return { label: "Safe", color: "positive" } as const;
  if (value >= thresholds.liquidation) return { label: "Watch", color: "warning" } as const;
  return { label: "At risk", color: "negative" } as const;
}

type HealthGaugeProps = {
  value: number;
};

export function HealthGauge({ value }: HealthGaugeProps) {
  const { colors } = useTheme();
  const status = statusOf(value);
  const low = fractionOf(thresholds.liquidation);
  const mid = fractionOf(thresholds.safeFrom);
  const marker = pointAt(fractionOf(value));

  return (
    <View accessibilityLabel={`Account health ${value.toFixed(2)}, ${status.label}`} style={{ alignItems: "center" }}>
      <Svg width={WIDTH} height={HEIGHT}>
        <Path d={arc(0, low - GAP)} stroke={colors.negative} strokeWidth={STROKE} fill="none" />
        <Path d={arc(low + GAP, mid - GAP)} stroke={colors.warning} strokeWidth={STROKE} fill="none" opacity={0.7} />
        <Path d={arc(mid + GAP, 1)} stroke={colors.positive} strokeWidth={STROKE} fill="none" />
        <Circle cx={marker.x} cy={marker.y} r={10} fill={colors.text} stroke={colors.surface} strokeWidth={3} />
      </Svg>
      <View style={{ position: "absolute", top: 54, alignItems: "center" }}>
        <AppText variant="display" style={{ fontSize: 44, lineHeight: 50 }}>
          {value.toFixed(2)}
        </AppText>
        <AppText variant="bodyLg" strong color={status.color}>
          {status.label}
        </AppText>
      </View>
    </View>
  );
}
