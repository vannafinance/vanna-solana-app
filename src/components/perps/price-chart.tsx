import { useState } from "react";
import { View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

import { formatUnits } from "@/format/format-amount";
import type { Candle } from "@/types/perps";
import { useTheme } from "@/theme/use-theme";

const PRICE_DECIMALS = 6;
const AXIS_WIDTH = 44;
const GRID_LINES = 4;
const PAD = 8;
const BADGE = { width: 46, height: 22 };

type PriceChartProps = {
  candles: readonly Candle[];
  height?: number;
  accessibilityLabel: string;
};

function toNumber(price: bigint) {
  return Number(price) / 1e6;
}

export function PriceChart({ candles, height = 184, accessibilityLabel }: PriceChartProps) {
  const { colors, fontFamily } = useTheme();
  const [width, setWidth] = useState(0);

  if (candles.length === 0) return <View style={{ height }} />;

  const max = Math.max(...candles.map((candle) => toNumber(candle.high)));
  const min = Math.min(...candles.map((candle) => toNumber(candle.low)));
  const span = max - min || 1;
  const plotWidth = Math.max(width - AXIS_WIDTH, 0);
  const plotHeight = height - PAD * 2;
  const yOf = (price: number) => PAD + (1 - (price - min) / span) * plotHeight;
  const slot = plotWidth / candles.length;
  const bodyWidth = slot * 0.64;
  const last = candles[candles.length - 1];
  const lastY = yOf(toNumber(last.close));

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height }}>
      {width === 0 ? null : (
        <Svg width={width} height={height} accessibilityLabel={accessibilityLabel}>
          {Array.from({ length: GRID_LINES }, (_, index) => {
            const y = PAD + (plotHeight / (GRID_LINES - 1)) * index;
            const price = max - (span / (GRID_LINES - 1)) * index;
            return (
              <G key={index}>
                <Line x1={0} y1={y} x2={plotWidth} y2={y} stroke={colors.divider} strokeWidth={1} />
                <SvgText x={width} y={y + 4} textAnchor="end" fontSize={10} fontFamily={fontFamily.regular} fill={colors.textMuted}>
                  {formatUnits(BigInt(Math.round(price * 1e6)), PRICE_DECIMALS, 0)}
                </SvgText>
              </G>
            );
          })}
          {candles.map((candle, index) => {
            const open = toNumber(candle.open);
            const close = toNumber(candle.close);
            const color = close >= open ? colors.primary : colors.short;
            const x = slot * index + slot / 2;
            return (
              <G key={index}>
                <Line x1={x} y1={yOf(toNumber(candle.high))} x2={x} y2={yOf(toNumber(candle.low))} stroke={color} strokeWidth={1.2} />
                <Rect
                  x={x - bodyWidth / 2}
                  y={yOf(Math.max(open, close))}
                  width={bodyWidth}
                  height={Math.max(Math.abs(yOf(open) - yOf(close)), 1.2)}
                  rx={1}
                  fill={color}
                />
              </G>
            );
          })}
          <Line x1={0} y1={lastY} x2={plotWidth} y2={lastY} stroke={colors.primary} strokeWidth={1} strokeDasharray="4 3" />
          <Rect x={width - BADGE.width} y={lastY - BADGE.height / 2} width={BADGE.width} height={BADGE.height} rx={4} fill={colors.primary} />
          <SvgText x={width - BADGE.width / 2} y={lastY + 4} textAnchor="middle" fontSize={11} fontFamily={fontFamily.semibold} fill={colors.onPrimary}>
            {formatUnits(last.close, PRICE_DECIMALS, 2)}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
