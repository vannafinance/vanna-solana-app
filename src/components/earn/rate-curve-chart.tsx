import { useMemo, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "@/theme/use-theme";
import type { RateSample } from "@/types/earn";

import { niceTicks } from "./chart-scale";

type RateCurveChartProps = {
  samples: readonly RateSample[];
  kink: RateSample;
  current: RateSample;
  onScrub: (sample: RateSample | null) => void;
};

const HEIGHT = 168;
const PAD_TOP = 28;
const PAD_BOTTOM = 26;
const PAD_RIGHT = 44;
const LABEL_SIZE = 11;

export function RateCurveChart({ samples, kink, current, onScrub }: RateCurveChartProps) {
  const { colors, fontFamily } = useTheme();
  const [width, setWidth] = useState(0);
  const [cursor, setCursor] = useState<RateSample | null>(null);

  const plot = useMemo(() => {
    const chartWidth = Math.max(width - PAD_RIGHT, 1);
    const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const ticks = niceTicks(0, samples[samples.length - 1].borrow, 3);
    const top = ticks[ticks.length - 1];
    const x = (utilization: number) => utilization * chartWidth;
    const y = (rate: number) => PAD_TOP + (1 - rate / top) * chartHeight;
    const trace = (rateOf: (sample: RateSample) => number) =>
      samples.map((sample, index) => `${index === 0 ? "M" : "L"}${x(sample.utilization).toFixed(1)} ${y(rateOf(sample)).toFixed(1)}`).join(" ");
    return { chartWidth, chartHeight, ticks, x, y, borrowPath: trace((sample) => sample.borrow), lenderPath: trace((sample) => sample.lender) };
  }, [samples, width]);

  const scrub = useMemo(() => {
    const move = (touchX: number) => {
      const fraction = Math.min(Math.max(touchX / plot.chartWidth, 0), 1);
      const sample = samples[Math.round(fraction * (samples.length - 1))];
      setCursor(sample);
      onScrub(sample);
    };
    const release = () => {
      setCursor(null);
      onScrub(null);
    };
    return Gesture.Pan()
      .minDistance(0)
      .failOffsetY([-16, 16])
      .onBegin((event) => scheduleOnRN(move, event.x))
      .onUpdate((event) => scheduleOnRN(move, event.x))
      .onFinalize(() => scheduleOnRN(release));
  }, [plot.chartWidth, samples, onScrub]);

  const baseline = PAD_TOP + plot.chartHeight;
  const nowX = plot.x(current.utilization);
  const label = `Interest rate curve. Borrow rate ${(current.borrow * 100).toFixed(2)}% at ${Math.round(current.utilization * 100)}% utilization; kink at ${Math.round(kink.utilization * 100)}%.`;
  const bottomLabels = [
    { x: 0, anchor: "start", text: "0%" },
    { x: plot.chartWidth / 2, anchor: "middle", text: "50%" },
    { x: plot.chartWidth, anchor: "end", text: "100% used" },
  ] as const;

  return (
    <GestureDetector gesture={scrub}>
      <View accessibilityRole="image" accessibilityLabel={label} onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {plot.ticks.map((tick) => (
              <Line key={tick} x1={0} x2={plot.chartWidth} y1={plot.y(tick)} y2={plot.y(tick)} stroke={colors.divider} strokeWidth={1} />
            ))}
            {plot.ticks.map((tick) => (
              <SvgText key={`label-${tick}`} x={width} y={plot.y(tick) + 4} textAnchor="end" fontSize={LABEL_SIZE} fill={colors.textMuted} fontFamily={fontFamily.regular}>
                {`${Math.round(tick * 100)}%`}
              </SvgText>
            ))}
            <Path d={plot.lenderPath} fill="none" stroke={colors.positive} strokeWidth={2} strokeDasharray="5 4" />
            <Path d={plot.borrowPath} fill="none" stroke={colors.link} strokeWidth={2.5} strokeLinejoin="round" />
            <Line x1={plot.x(kink.utilization)} x2={plot.x(kink.utilization)} y1={PAD_TOP} y2={baseline} stroke={colors.divider} strokeWidth={1} strokeDasharray="2 3" />
            <SvgText x={plot.x(kink.utilization) - 8} y={plot.y(kink.borrow) - 10} textAnchor="end" fontSize={LABEL_SIZE} fill={colors.textMuted} fontFamily={fontFamily.regular}>
              {`Kink ${Math.round(kink.utilization * 100)}%`}
            </SvgText>
            {bottomLabels.map(({ x, anchor, text }) => (
              <SvgText key={text} x={x} y={HEIGHT - 6} textAnchor={anchor} fontSize={LABEL_SIZE} fill={colors.textMuted} fontFamily={fontFamily.regular}>
                {text}
              </SvgText>
            ))}
            <Line x1={nowX} x2={nowX} y1={PAD_TOP - 10} y2={baseline} stroke={colors.coral} strokeWidth={1.5} strokeDasharray="4 4" />
            <Circle cx={nowX} cy={plot.y(current.borrow)} r={5} fill={colors.coral} stroke={colors.surface} strokeWidth={2} />
            <SvgText x={nowX + 6} y={PAD_TOP - 12} fontSize={LABEL_SIZE} fill={colors.text} fontFamily={fontFamily.semibold}>
              Now
            </SvgText>
            {cursor ? (
              <>
                <Line x1={plot.x(cursor.utilization)} x2={plot.x(cursor.utilization)} y1={PAD_TOP} y2={baseline} stroke={colors.text} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
                <Circle cx={plot.x(cursor.utilization)} cy={plot.y(cursor.borrow)} r={5} fill={colors.link} stroke={colors.surface} strokeWidth={2} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
    </GestureDetector>
  );
}
