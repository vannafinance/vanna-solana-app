import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { AppText } from "@/components/ui/app-text";
import { formatPercent } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { RateCurve } from "@/types/earn";

const HEIGHT = 140;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;
const FULL_UTILIZATION_BPS = 10_000;

type RateCurveChartProps = {
  curve: RateCurve;
  utilizationBps: number;
  borrowApyBps: number;
};

export function RateCurveChart({ curve, utilizationBps, borrowApyBps }: RateCurveChartProps) {
  const { colors, fontFamily, fontSize } = useTheme();
  const [width, setWidth] = useState(0);

  const x = (bps: number) => (bps / FULL_UTILIZATION_BPS) * width;
  const y = (rateBps: number) => PAD_TOP + (1 - rateBps / curve.maxRateBps) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
  const nowX = x(utilizationBps);
  const kinkX = x(curve.kinkUtilizationBps);
  const textProps = { fill: colors.textMuted, fontSize: fontSize.label, fontFamily: fontFamily.regular } as const;

  return (
    <View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Line x1={0} y1={HEIGHT - PAD_BOTTOM} x2={width} y2={HEIGHT - PAD_BOTTOM} stroke={colors.divider} strokeWidth={1} />
            <Path
              d={`M${x(0)} ${y(curve.baseBps)} L${kinkX} ${y(curve.kinkRateBps)} L${x(FULL_UTILIZATION_BPS)} ${y(curve.maxRateBps)}`}
              stroke={colors.primary}
              strokeWidth={2.5}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <Line x1={nowX} y1={0} x2={nowX} y2={HEIGHT - PAD_BOTTOM} stroke={colors.negative} strokeWidth={1.5} strokeDasharray="3 4" />
            <Circle cx={nowX} cy={y(borrowApyBps)} r={5} fill={colors.negative} />
            <SvgText x={nowX + 8} y={PAD_TOP} {...textProps}>{`Now · ${formatPercent(utilizationBps, 1)}`}</SvgText>
            <SvgText x={kinkX} y={y(curve.kinkRateBps) - 8} textAnchor="middle" {...textProps}>{`Kink ${formatPercent(curve.kinkUtilizationBps, 0)}`}</SvgText>
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText color="textMuted">0% utilization</AppText>
        <AppText color="textMuted">100%</AppText>
      </View>
    </View>
  );
}
