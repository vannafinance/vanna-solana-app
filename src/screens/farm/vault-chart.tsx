import { memo, useCallback, useMemo, useState } from "react";
import { type GestureResponderEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";

import { dLbl, niceStep } from "./vault-model";

/* Farm vault history chart (design chart() / wireCharts(), farm .fm-ccard): y labels on the left, a line + area, an optional dashed
   comparison line, a dot on the newest point, and a touch / drag readout above. Real daily points only; long series are thinned
   for drawing (every k-th day plus the newest), and each drawn point is still a real day. */
const YW = 48, MAX_PTS = 150, DAY = 864e5;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monYear = (ms: number) => {
  const d = new Date(ms);
  return `${MON[d.getUTCMonth()]} ’${String(d.getUTCFullYear()).slice(2)}`;
};
export const fullDay = (ms: number) => {
  const d = new Date(ms);
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

function thin(n: number) {
  if (n <= MAX_PTS) return null;
  const k = Math.ceil(n / MAX_PTS), idx: number[] = [];
  for (let i = (n - 1) % k; i < n; i += k) idx.push(i);
  return idx;
}

export const FarmChart = memo(function FarmChart({ data, cmp, dates, axis, read, label, h = 168 }: {
  data: number[]; cmp?: number[]; dates: number[]; axis: (t: number, step: number) => string; read: (i: number) => string; label: string; h?: number;
}) {
  const { colors, isDark } = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const line = isDark ? "#FF5CAB" : "#E2087A", area = isDark ? "rgba(255,92,171,0.2)" : "rgba(226,8,122,0.16)";

  const g = useMemo(() => {
    const keep = thin(data.length);
    const pick = <T,>(a: T[]) => (keep ? keep.map((i) => a[i]) : a);
    const d = pick(data), c = cmp ? pick(cmp) : undefined, ix = keep ?? data.map((_, i) => i), n = d.length;
    const all = c ? d.concat(c) : d;
    let lo = Math.min(...all), hi = Math.max(...all);
    const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.01 || 1;
    lo -= pad;
    hi += pad;
    const st = niceStep(hi - lo);
    lo = Math.floor(lo / st) * st;
    hi = Math.ceil(hi / st) * st;
    if (hi <= lo) hi = lo + st;
    const ticks: number[] = [];
    for (let k = 0, t = lo; t <= hi + st / 1000 && k < 12; k++, t = lo + k * st) ticks.push(t);
    const pw = Math.max(0, w - YW);
    const Y = (v: number) => ((hi - v) / (hi - lo)) * h;
    const X = (i: number) => (n > 1 ? i / (n - 1) : 0) * pw;
    const pts = (s: number[]) => s.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
    const main = pts(d);
    const xl = [0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1].filter((v, i, a) => a.indexOf(v) === i);
    const long = dates[dates.length - 1] - dates[0] > 330 * DAY;
    return { d, ix, n, st, ticks, pw, Y, X, xl, long, main, area: `${main}L${X(n - 1).toFixed(1)} ${h}L0 ${h}Z`, cmp: c ? pts(c) : null };
  }, [data, cmp, dates, w, h]);

  const onTouch = useCallback(
    (e: GestureResponderEvent) => {
      if (g.pw <= 0 || g.n < 2) return;
      const f = Math.max(0, Math.min(1, (e.nativeEvent.locationX - YW) / g.pw)), i = Math.round(f * (g.n - 1));
      setSel((s) => (s === i ? s : i));
    },
    [g],
  );
  const off = useCallback(() => setSel(null), []);
  if (g.n < 2) return null;
  const cur = sel ?? g.n - 1;
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.ro, { color: colors.muted }]} numberOfLines={1}>{read(g.ix[cur])}</Text>
      <View
        style={{ height: h + 20 }}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onTouchStart={onTouch}
        onTouchMove={onTouch}
        onTouchEnd={off}
        onTouchCancel={off}
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
      >
        {g.pw > 0 && (
          <>
            <Svg width={w} height={h} pointerEvents="none" style={StyleSheet.absoluteFill}>
              {g.ticks.map((t) => (
                <Line key={t} x1={YW} x2={w} y1={g.Y(t)} y2={g.Y(t)} stroke={colors.divider} strokeWidth={1} />
              ))}
              <Svg x={YW} width={g.pw} height={h}>
                <Path d={g.area} fill={area} />
                {g.cmp && <Path d={g.cmp} fill="none" stroke={colors.muted} strokeWidth={1.5} strokeDasharray="5 4" />}
                <Path d={g.main} fill="none" stroke={line} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </Svg>
              {sel != null && <Line x1={YW + g.X(sel)} x2={YW + g.X(sel)} y1={0} y2={h} stroke={colors.borderControl} strokeWidth={1} />}
              <Circle cx={YW + g.X(cur)} cy={g.Y(g.d[cur])} r={sel != null ? 5 : 4} fill={sel != null ? colors.surface : line} stroke={line} strokeWidth={sel != null ? 2 : 0} />
            </Svg>
            {g.ticks.map((t) => (
              <Text key={"y" + t} style={[styles.ax, { top: g.Y(t) - 7, left: 0, width: YW - 8, textAlign: "right", color: colors.muted }]} numberOfLines={1}>
                {axis(t, g.st)}
              </Text>
            ))}
            {g.xl.map((i, j) => (
              <Text
                key={"x" + i}
                style={[
                  styles.ax,
                  { top: h + 4, width: 60, color: colors.muted, left: YW + g.X(i) - (j === 0 ? 0 : j === g.xl.length - 1 ? 60 : 30), textAlign: j === 0 ? "left" : j === g.xl.length - 1 ? "right" : "center" },
                ]}
                numberOfLines={1}
              >
                {(g.long ? monYear : dLbl)(dates[g.ix[i]])}
              </Text>
            ))}
          </>
        )}
      </View>
    </View>
  );
});

/* Range pills (design ranges(): 1W / 1M / 3M / All). Only ranges the data covers are passed in; one option shows no pills. */
export type Range = 7 | 30 | 90 | 0;
export const RANGE_LABEL: Record<Range, string> = { 7: "1W", 30: "1M", 90: "3M", 0: "All" };
export function RangePills({ options, value, onChange }: { options: Range[]; value: Range; onChange: (r: Range) => void }) {
  const { colors } = useTheme();
  if (options.length < 2) return null;
  return (
    <View style={styles.rng} accessibilityRole="radiogroup" accessibilityLabel="Range">
      {options.map((r) => {
        const on = r === value;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            hitSlop={{ top: 6, bottom: 6 }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.pill, on ? { backgroundColor: colors.pinkTint, borderColor: "transparent" } : { borderColor: colors.border }]}
          >
            <Text style={[styles.pillT, { color: on ? colors.onPinkTint : colors.muted }]}>{RANGE_LABEL[r]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* Which ranges a daily series covers, and its slice for a range (web inRange: points after last - days). */
export function rangeSlice<T extends { at: number }>(rows: T[], r: Range): T[] {
  if (!r || !rows.length) return rows;
  const from = rows[rows.length - 1].at - r * DAY;
  return rows.filter((p) => p.at > from);
}
export function rangesFor(rows: { at: number }[], hasOlder = false): Range[] {
  if (rows.length < 2) return [];
  const span = rows[rows.length - 1].at - rows[0].at;
  const fixed = ([7, 30, 90] as const).filter((d) => span >= (d - 1) * DAY);
  const widest = fixed.length ? rangeSlice(rows, fixed[fixed.length - 1]).length : 0;
  return [...fixed, ...(hasOlder || rows.length > widest ? [0 as const] : [])];
}

const styles = StyleSheet.create({
  ro: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, minHeight: 16, fontVariant: ["tabular-nums"] },
  ax: { position: "absolute", fontFamily: font.regular, fontSize: 11, lineHeight: 14 },
  rng: { flexDirection: "row", gap: 4 },
  pill: { minWidth: 44, height: 32, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pillT: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
});
