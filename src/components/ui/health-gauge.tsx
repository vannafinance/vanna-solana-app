import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { AppText } from "./app-text";
import { health as thresholds } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// The regular gauge (Profile); "compact" draws it at three quarters for cards that sit beside other figures.
const SIZES = { regular: 1, compact: 0.75 } as const;
const WIDTH = 240;
const HEIGHT = 132;
const CENTER_X = WIDTH / 2;
const CENTER_Y = 116;
const RADIUS = 96;
const STROKE = 14;
const MIN = 1;
const MAX = 2.5;

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
  size?: keyof typeof SIZES;
};

export function HealthGauge({ value, size = "regular" }: HealthGaugeProps) {
  const k = SIZES[size];
  const { colors } = useTheme();
  const status = statusOf(value);
  const low = fractionOf(thresholds.liquidation);
  const mid = fractionOf(thresholds.safeFrom);
  const marker = pointAt(fractionOf(value));

  return (
    <View accessibilityLabel={`Account health ${value.toFixed(2)}, ${status.label}`} style={{ width: WIDTH * k, height: HEIGHT * k, alignSelf: "center" }}>
      <Svg width={WIDTH * k} height={HEIGHT * k} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Path d={arc(0, low)} stroke={colors.coral} strokeWidth={STROKE} fill="none" />
        <Path d={arc(low, mid)} stroke={colors.healthWatch} strokeWidth={STROKE} fill="none" />
        <Path d={arc(mid, 1)} stroke={colors.positive} strokeWidth={STROKE} fill="none" />
        <Circle cx={marker.x} cy={marker.y} r={11} fill={colors.surface} />
        <Circle cx={marker.x} cy={marker.y} r={7} fill={colors.text} />
      </Svg>
      <View style={{ position: "absolute", top: 61 * k, left: 0, right: 0, alignItems: "center" }}>
        <AppText variant="display" style={{ fontSize: 36 * k, lineHeight: 44 * k }}>
          {value.toFixed(2)}
        </AppText>
      </View>
      <View style={{ position: "absolute", top: 102 * k, left: 0, right: 0, alignItems: "center" }}>
        <AppText variant={size === "compact" ? "caption" : "body"} strong color={status.color}>
          {status.label}
        </AppText>
      </View>
    </View>
  );
}
