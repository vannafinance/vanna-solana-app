import { useId, useMemo, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "@/theme/use-theme";

import { nearestIndex, niceTicks } from "./chart-scale";

export type ChartPoint = { at: number; value: number; text: string };

type LiveChartProps = {
  points: readonly ChartPoint[];
  label: string;
  line: string;
  ink: string;
  inkMuted: string;
  grid: string;
  ring: string;
  includeZero?: boolean;
  formatAxis: (value: number, step: number) => string;
  formatDate: (at: number) => string;
  onScrub: (point: ChartPoint | null) => void;
};

const HEIGHT = 150;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;
const PAD_RIGHT = 52;
const LABEL_SIZE = 11;
const DATE_ANCHORS = [
  { at: 0, anchor: "start" },
  { at: 0.5, anchor: "middle" },
  { at: 1, anchor: "end" },
] as const;

export function LiveChart({ points, label, line, ink, inkMuted, grid, ring, includeZero = false, formatAxis, formatDate, onScrub }: LiveChartProps) {
  const { fontFamily } = useTheme();
  const gradientId = useId();
  const [width, setWidth] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);

  const plot = useMemo(() => {
    const values = points.map((point) => point.value);
    const ticks = niceTicks(includeZero ? Math.min(0, ...values) : Math.min(...values), Math.max(...values), 3);
    const low = ticks[0];
    const high = ticks[ticks.length - 1];
    const chartWidth = Math.max(width - PAD_RIGHT, 1);
    const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const start = points[0].at;
    const end = points[points.length - 1].at;
    const xs = points.map((point) => (end === start ? 0 : ((point.at - start) / (end - start)) * chartWidth));
    const yOf = (value: number) => PAD_TOP + (1 - (value - low) / (high - low || 1)) * chartHeight;
    const ys = points.map((point) => yOf(point.value));
    return { ticks, chartWidth, chartHeight, start, end, xs, ys, yOf };
  }, [points, width, includeZero]);

  const scrub = useMemo(() => {
    const move = (x: number) => {
      const index = nearestIndex(plot.xs, Math.min(Math.max(x, 0), plot.chartWidth));
      setCursor(index);
      onScrub(points[index]);
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
  }, [plot, points, onScrub]);

  const path = plot.xs.map((x, index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${plot.ys[index].toFixed(1)}`).join(" ");
  const baseline = PAD_TOP + plot.chartHeight;
  const tickStep = plot.ticks[1] - plot.ticks[0];
  const lastIndex = points.length - 1;

  return (
    <GestureDetector gesture={scrub}>
      <View accessibilityRole="image" accessibilityLabel={label} onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={line} stopOpacity={0.28} />
                <Stop offset="1" stopColor={line} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {plot.ticks.map((tick) => (
              <Line key={tick} x1={0} x2={plot.chartWidth} y1={plot.yOf(tick)} y2={plot.yOf(tick)} stroke={grid} strokeWidth={1} />
            ))}
            {plot.ticks.map((tick) => (
              <SvgText key={`label-${tick}`} x={width} y={plot.yOf(tick) + 4} textAnchor="end" fontSize={LABEL_SIZE} fill={inkMuted} fontFamily={fontFamily.regular}>
                {formatAxis(tick, tickStep)}
              </SvgText>
            ))}
            <Path d={`${path} L${plot.chartWidth} ${baseline} L0 ${baseline} Z`} fill={`url(#${gradientId})`} />
            <Path d={path} fill="none" stroke={line} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {DATE_ANCHORS.map(({ at, anchor }) => (
              <SvgText key={at} x={at * plot.chartWidth} y={HEIGHT - 6} textAnchor={anchor} fontSize={LABEL_SIZE} fill={inkMuted} fontFamily={fontFamily.regular}>
                {formatDate(plot.start + (plot.end - plot.start) * at)}
              </SvgText>
            ))}
            <Circle cx={plot.xs[lastIndex]} cy={plot.ys[lastIndex]} r={3.5} fill={line} />
            {cursor !== null ? (
              <>
                <Line x1={plot.xs[cursor]} x2={plot.xs[cursor]} y1={PAD_TOP - 4} y2={baseline} stroke={ink} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
                <Circle cx={plot.xs[cursor]} cy={plot.ys[cursor]} r={5} fill={line} stroke={ring} strokeWidth={2} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
    </GestureDetector>
  );
}
