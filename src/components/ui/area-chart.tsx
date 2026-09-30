import { useState } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

type AreaChartProps = {
  points: readonly number[];
  height?: number;
  stroke: string;
  fillFrom: string;
  fillTo: string;
  strokeWidth?: number;
};

export function AreaChart({ points, height = 140, stroke, fillFrom, fillTo, strokeWidth = 2.5 }: AreaChartProps) {
  const [width, setWidth] = useState(0);

  const path = (() => {
    if (width === 0 || points.length < 2) return null;
    const min = Math.min(...points);
    const span = Math.max(...points) - min || 1;
    const pad = strokeWidth;
    const coords = points.map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = pad + (1 - (value - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    const line = `M${coords.join(" L")}`;
    return { line, area: `${line} L${width} ${height} L0 ${height} Z` };
  })();

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height }}>
      {path ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={fillFrom} />
              <Stop offset="1" stopColor={fillTo} />
            </LinearGradient>
          </Defs>
          <Path d={path.area} fill="url(#area)" />
          <Path d={path.line} stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
}
