import { useState } from "react";
import { type GestureResponderEvent, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";

import { dLbl, niceStep } from "./vault-model";

/* Farm vault chart (design chart() / wireCharts()): y labels on the left, a line + area (or bars), an optional dashed comparison
   series or flat reference, a dot on the last point, and a touch / drag readout line above it. */
const YW = 48;
export function FarmChart({ data, cmp, ref, bars, zero, h = 168, dates, axis, read }: {
  data: number[]; cmp?: number[]; ref?: number; bars?: boolean; zero?: boolean; h?: number; dates: number[];
  axis: (t: number, step: number) => string; read: (i: number) => string;
}) {
  const { colors, isDark } = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const line = isDark ? "#FF54A6" : "#E8006F", area = isDark ? "rgba(255,84,166,0.2)" : "rgba(232,0,111,0.16)";
  const n = data.length;
  if (n < 2) return null;
  const all = [...data, ...(cmp ?? []), ...(ref != null ? [ref] : []), ...(zero || bars ? [0] : [])];
  let lo = Math.min(...all), hi = Math.max(...all);
  if (bars) hi = Math.max(0, hi) * 1.08;
  else if (!zero) {
    const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.01 || 1;
    lo -= pad;
    hi += pad;
  } else hi += (hi - lo) * 0.08 || 1;
  const st = niceStep(hi - lo);
  lo = Math.floor(lo / st) * st;
  hi = Math.ceil(hi / st) * st;
  if (hi <= lo) hi = lo + st;
  const ticks: number[] = [];
  for (let k = 0, t = lo; t <= hi + st / 1000 && k < 12; k++, t = lo + k * st) ticks.push(t);
  const pw = Math.max(0, w - YW);
  const Y = (v: number) => ((hi - v) / (hi - lo)) * h;
  const X = (i: number) => (bars ? (i + 0.5) / n : i / (n - 1)) * pw;
  const idxAt = (e: GestureResponderEvent) => {
    const f = Math.max(0, Math.min(1, (e.nativeEvent.locationX - YW) / (pw || 1)));
    return bars ? Math.min(n - 1, Math.floor(f * n)) : Math.round(f * (n - 1));
  };
  const onTouch = (e: GestureResponderEvent) => pw > 0 && setSel(idxAt(e));
  const pts = (d: number[]) => d.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
  const base = lo < 0 && hi > 0 ? Y(0) : h;
  const xl = [0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1].filter((v, i, a) => a.indexOf(v) === i);
  const cur = sel ?? n - 1;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: colors.muted, fontVariant: ["tabular-nums"], minHeight: 16 }}>{read(cur)}</Text>
      <View style={{ height: h + 20 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} onTouchStart={onTouch} onTouchMove={onTouch} onTouchEnd={() => setSel(null)} onTouchCancel={() => setSel(null)}>
        {pw > 0 && (
          <>
            <Svg width={w} height={h} pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
              {ticks.map((t) => (
                <Line key={t} x1={YW} x2={w} y1={Y(t)} y2={Y(t)} stroke={Math.abs(t) < st / 1000 ? colors.borderControl : colors.divider} strokeWidth={1} />
              ))}
              <Svg x={YW} width={pw} height={h}>
                {bars ? (
                  data.map((d, i) => {
                    const bw = pw / n, y0 = Y(0), yd = Y(d);
                    return <Rect key={i} x={i * bw + bw * 0.16} width={bw * 0.68} y={Math.min(yd, y0)} height={Math.max(1, Math.abs(yd - y0))} fill={d >= 0 ? colors.positive : colors.negative} />;
                  })
                ) : (
                  <>
                    <Path d={`${pts(data)}L${X(n - 1).toFixed(1)} ${base.toFixed(1)}L0 ${base.toFixed(1)}Z`} fill={area} />
                    {ref != null && <Line x1={0} x2={pw} y1={Y(ref)} y2={Y(ref)} stroke={colors.muted} strokeWidth={1.5} strokeDasharray="5 4" />}
                    {cmp && <Path d={pts(cmp)} fill="none" stroke={colors.muted} strokeWidth={1.5} strokeDasharray="5 4" />}
                    <Path d={pts(data)} fill="none" stroke={line} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  </>
                )}
              </Svg>
              {sel != null && <Line x1={YW + X(sel)} x2={YW + X(sel)} y1={0} y2={h} stroke={colors.borderControl} strokeWidth={1} />}
              {!bars && <Circle cx={YW + X(cur)} cy={Y(data[cur])} r={sel != null ? 5 : 4} fill={sel != null ? colors.surface : line} stroke={line} strokeWidth={sel != null ? 2 : 0} />}
            </Svg>
            {ticks.map((t) => (
              <Text key={"y" + t} style={{ position: "absolute", left: 0, width: YW - 8, top: Y(t) - 7, textAlign: "right", fontFamily: font.regular, fontSize: 11, lineHeight: 14, color: colors.muted }} numberOfLines={1}>
                {axis(t, st)}
              </Text>
            ))}
            {xl.map((i, j) => (
              <Text
                key={"x" + i}
                style={{
                  position: "absolute", top: h + 4, fontFamily: font.regular, fontSize: 11, lineHeight: 14, color: colors.muted, width: 60,
                  left: YW + X(i) - (j === 0 ? 0 : j === xl.length - 1 ? 60 : 30), textAlign: j === 0 ? "left" : j === xl.length - 1 ? "right" : "center",
                }}
              >
                {dLbl(dates[i])}
              </Text>
            ))}
          </>
        )}
      </View>
    </View>
  );
}
