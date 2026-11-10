import { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { nf } from "@/format";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";

/* Line + area chart (design portfolio.js chart): zero-based nice ticks, grid lines, y labels on the right, x labels below.
   Sample series come from curve() until the time-series backend lands. */

// "Nice" ticks: two or three steps of 1 / 2 / 2.5 / 5 x 10^n covering lo..hi.
export function niceTicks(lo: number, hi: number) {
  if (hi - lo < 1e-9) {
    hi += 1;
    lo -= 1;
  }
  const raw = (hi - lo) / 2, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw) || 10 * mag;
  lo = Math.floor(lo / step + 1e-9) * step;
  hi = Math.ceil(hi / step - 1e-9) * step;
  if (hi - lo < step) hi = lo + step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(v);
  return out;
}

// The design's sample growth curve ending at `end` (a small wobble that settles), n points, flat zero before `from`.
export function curve(end: number, seed = 1, n = 31, from = 0) {
  return Array.from({ length: n }, (_, i) => {
    if (i < from) return 0;
    const f = (i - from) / Math.max(1, n - 1 - from), w = 1 + 0.12 * Math.sin(i * 1.7 + seed) * (1 - f) * (i < n - 1 ? 1 : 0);
    const v = end * Math.pow(f, 1.12) * w;
    return end >= 0 ? Math.max(0, v) : Math.min(0, v);
  });
}

// zero = false: a price chart (the axis hugs the data); dot = a dot on the last point; refLine = a dashed reference line (an entry price).
// three ticks around a price range (not zero based)
function priceTicks(lo: number, hi: number) {
  const pad = (hi - lo) * 0.08 || hi * 0.01 || 1;
  const a = lo - pad, b = hi + pad;
  return [a, (a + b) / 2, b];
}

export function Chart({ pts, color, height = 96, x = ["Sep 7", "Sep 22", "Oct 7"], label, zero = true, dot, refLine }: { pts: number[]; color: string; height?: number; x?: string[]; label: string; zero?: boolean; dot?: boolean; refLine?: { v: number; label: string } }) {
  const { colors, isDark } = useTheme();
  const [w, setW] = useState(0);
  if (!pts.length || pts.every((v) => Math.abs(v) < 0.005)) {
    return (
      <View style={{ height, borderRadius: 12, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.muted }}>No history yet</Text>
      </View>
    );
  }
  const lo0 = Math.min(...pts, ...(refLine ? [refLine.v] : [])), hi0 = Math.max(...pts, ...(refLine ? [refLine.v] : []));
  const ticks = zero ? niceTicks(Math.min(0, lo0), Math.max(0, hi0)) : priceTicks(lo0, hi0);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const H = height;
  const X = (i: number) => (i / (pts.length - 1)) * w;
  const Y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const d = pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
  const base = (zero ? Y(Math.max(lo, Math.min(hi, 0))) : H).toFixed(1);
  const dec = hi - lo < 10 ? 2 : 0;
  const fy = (v: number) => (zero ? (v < 0 ? "−$" : "$") : "") + nf(Math.abs(v), zero ? dec : hi - lo < 10 ? 2 : 0);

  return (
    <View accessibilityRole="image" accessibilityLabel={label}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {w > 0 && (
            <Svg width={w} height={H} style={{ overflow: "visible" }}>
              {ticks.map((t, i) => (
                <Line key={i} x1={0} x2={w} y1={Y(t)} y2={Y(t)} stroke={isDark ? "#333333" : colors.divider} strokeWidth={1} />
              ))}
              <Path d={`${d}L${w} ${base}L0 ${base}Z`} fill={color} fillOpacity={0.12} />
              <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {refLine && <Line x1={0} x2={w} y1={Y(refLine.v)} y2={Y(refLine.v)} stroke={colors.muted} strokeDasharray="3 3" />}
              {dot && <Circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r={4} fill={color} stroke={colors.surface} strokeWidth={2} />}
            </Svg>
          )}
        </View>
        <View style={{ height: H + 16, marginVertical: -8, justifyContent: "space-between" }}>
          {ticks
            .slice()
            .reverse()
            .map((t, i) => (
              <Text key={i} style={{ fontFamily: font.regular, fontSize: 11, lineHeight: 16, color: colors.muted, textAlign: "right", fontVariant: ["tabular-nums"] }}>
                {fy(t)}
              </Text>
            ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, marginRight: 40 }}>
        {x.map((l, i) => (
          <Text key={i} style={{ fontFamily: font.regular, fontSize: 11, lineHeight: 14, color: colors.muted }}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}
