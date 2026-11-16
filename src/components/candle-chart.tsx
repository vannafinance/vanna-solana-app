import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedProps, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue } from "react-native-reanimated";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";

import type { Candle } from "@/chain/market-live";
import { Icon } from "@/components/ui/icon";
import { nf } from "@/format";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";
import { haptic } from "@/ui/haptics";

/* Interactive candle chart (the web terminal's price-chart.tsx): press and hold, then drag for a crosshair snapped to the nearest
   candle with an OHLC readout and a price tag on the axis; drag sideways to pan back through history (older candles load from
   the API); pinch or tap + / − to zoom the number of visible candles; tap the full-screen icon to open the expanded chart modal. */
const UP = "#10B981", DN = "#EF4444";
const DEF_H = 300;
const MIN_VIS = 12, MAX_VIS = 240, DEF_VIS = 70;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);
const AnimatedInput = Animated.createAnimatedComponent(TextInput);

type Geom = { up: string; dn: string; lo: number; hi: number; step: number; first: number; cw: number; i0: number; i1: number; lastY: number; entryY: number };
const EMPTY: Geom = { up: "M0 0", dn: "M0 0", lo: 0, hi: 1, step: 1, first: 0, cw: 1, i0: 0, i1: 0, lastY: -10, entryY: -10 };

const fmtPx = (v: number) => {
  "worklet";
  const p = v.toFixed(v >= 10 ? 2 : 4).split(".");
  return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (p[1] ? "." + p[1] : "");
};

function computeGeom(d: number[], n: number, W: number, H: number, v: number, o: number, en: number): Geom {
  "worklet";
  if (!n || !W) return EMPTY;
  const cw = W / v, first = n - v - o;
  const i0 = Math.max(0, Math.floor(first)), i1 = Math.min(n - 1, Math.ceil(first + v) - 1);
  if (i1 < i0) return EMPTY;
  let lo = Infinity, hi = -Infinity;
  for (let i = i0; i <= i1; i++) {
    if (d[i * 5 + 3] < lo) lo = d[i * 5 + 3];
    if (d[i * 5 + 2] > hi) hi = d[i * 5 + 2];
  }
  if (en > 0) {
    lo = Math.min(lo, en);
    hi = Math.max(hi, en);
  }
  if (hi - lo < 1e-9) {
    hi += 1;
    lo -= 1;
  }
  const raw = (hi - lo) / 3.5, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = 10 * mag;
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * mag >= raw) {
      step = m * mag;
      break;
    }
  }
  lo = Math.floor(lo / step + 1e-9) * step;
  hi = Math.ceil(hi / step - 1e-9) * step;
  if (hi - lo < step) hi = lo + step;
  const span = hi - lo;
  const bw = Math.max(1.2, cw * 0.33);
  let up = "", dn = "";
  for (let i = i0; i <= i1; i++) {
    const b = i * 5;
    const x = (i - first + 0.5) * cw;
    const yo = H - ((d[b + 1] - lo) / span) * H, yc = H - ((d[b + 4] - lo) / span) * H;
    const yh = H - ((d[b + 2] - lo) / span) * H, yl = H - ((d[b + 3] - lo) / span) * H;
    const top = Math.min(yo, yc), ht = Math.max(1.5, Math.abs(yo - yc));
    const s = `M${x.toFixed(1)} ${yh.toFixed(1)}V${yl.toFixed(1)}M${(x - bw).toFixed(1)} ${top.toFixed(1)}h${(2 * bw).toFixed(1)}v${ht.toFixed(1)}h${(-2 * bw).toFixed(1)}Z`;
    if (d[b + 4] >= d[b + 1]) up += s;
    else dn += s;
  }
  return {
    up: up || "M0 0", dn: dn || "M0 0", lo, hi, step, first, cw, i0, i1,
    lastY: H - ((d[(n - 1) * 5 + 4] - lo) / span) * H,
    entryY: en > 0 ? H - ((en - lo) / span) * H : -10,
  };
}

function when(t: number, tf: string) {
  const d = new Date(t);
  const day = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const hm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return tf === "1D" ? day : `${day} ${hm}`;
}

export function CandleChart({
  symbol,
  tf,
  candles,
  entry,
  side,
  onNearStart,
  height = DEF_H,
  onFullScreen,
  isFullScreen,
}: {
  symbol: string;
  tf: string;
  candles: Candle[];
  entry?: number;
  side?: string;
  onNearStart?: () => void;
  height?: number;
  onFullScreen?: () => void;
  isFullScreen?: boolean;
}) {
  const H = height;
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const [scale, setScale] = useState<{ lo: number; hi: number; step: number }>({ lo: 0, hi: 1, step: 1 });
  const [sel, setSel] = useState(-1);
  const [webTag, setWebTag] = useState("");
  const [visState, setVisState] = useState(DEF_VIS);
  const [offState, setOffState] = useState(0);

  // shared state read by the worklets
  const data = useSharedValue<number[]>([]);
  const count = useSharedValue(0);
  const width = useSharedValue(0);
  const heightSv = useSharedValue(H);
  const vis = useSharedValue(DEF_VIS);
  const off = useSharedValue(0); // candles scrolled back from the newest one
  const entrySv = useSharedValue(-1);
  const act = useSharedValue(0);
  const cx = useSharedValue(0);
  const cy = useSharedValue(0);
  const startOff = useSharedValue(0);
  const startVis = useSharedValue(DEF_VIS);

  const flat = useMemo(() => {
    const a = new Array<number>(candles.length * 5);
    candles.forEach((c, i) => {
      a[i * 5] = c.t;
      a[i * 5 + 1] = c.o;
      a[i * 5 + 2] = c.h;
      a[i * 5 + 3] = c.l;
      a[i * 5 + 4] = c.c;
    });
    return a;
  }, [candles]);
  useEffect(() => {
    data.value = flat;
    count.value = candles.length;
  }, [flat, candles.length, data, count]);
  useEffect(() => {
    entrySv.value = entry ?? -1;
  }, [entry, entrySv]);
  useEffect(() => {
    width.value = w;
  }, [w, width]);
  useEffect(() => {
    heightSv.value = H;
  }, [H, heightSv]);
  useEffect(() => {
    // a new market or timeframe starts at the newest candles
    vis.value = DEF_VIS;
    off.value = 0;
  }, [symbol, tf, vis, off]);

  const zoomBy = useCallback(
    (factor: number) => {
      const next = Math.max(MIN_VIS, Math.min(MAX_VIS, Math.round(vis.value * factor)));
      vis.value = next;
      setVisState(next);
      haptic.tick();
    },
    [vis],
  );
  const resetZoom = useCallback(() => {
    vis.value = DEF_VIS;
    off.value = 0;
    setVisState(DEF_VIS);
    setOffState(0);
    haptic.tick();
  }, [vis, off]);

  const geom = useDerivedValue<Geom>(() => {
    return computeGeom(data.value, count.value, width.value, heightSv.value, vis.value, off.value, entrySv.value);
  });

  // React-computed geometry guarantees immediate live candle repaints on Web and initial mount
  const jsGeom = useMemo(
    () => computeGeom(flat, candles.length, w, H, visState, offState, entry ?? -1),
    [flat, candles.length, w, H, visState, offState, entry],
  );

  // grid lines and axis labels are React (they change only when the nice-tick scale changes)
  useAnimatedReaction(
    () => {
      const g = geom.value;
      return `${g.lo}|${g.hi}|${g.step}`;
    },
    (cur, prev) => {
      if (cur !== prev) {
        const g = geom.value;
        runOnJS(setScale)({ lo: g.lo, hi: g.hi, step: g.step });
      }
    },
  );
  useAnimatedReaction(
    () => `${Math.round(vis.value)}|${Math.round(off.value)}`,
    (cur, prev) => {
      if (cur !== prev) {
        runOnJS(setVisState)(vis.value);
        runOnJS(setOffState)(off.value);
      }
    },
  );

  // the candle under the crosshair
  const snapped = useDerivedValue(() => {
    const g = geom.value;
    if (!act.value) return -1;
    const i = Math.round(g.first + cx.value / g.cw - 0.5);
    return Math.max(g.i0, Math.min(g.i1, i));
  });
  const onSel = useCallback((i: number) => {
    setSel(i);
    if (i >= 0) haptic.tick();
  }, []);
  useAnimatedReaction(
    () => snapped.value,
    (cur, prev) => {
      if (cur !== prev) runOnJS(onSel)(cur);
    },
  );
  const onTag = useCallback((v: string) => setWebTag(v), []);
  useAnimatedReaction(
    () => (Platform.OS === "web" && act.value ? fmtPx(geom.value.hi - (Math.max(0, Math.min(heightSv.value, cy.value)) / heightSv.value) * (geom.value.hi - geom.value.lo)) : ""),
    (cur, prev) => {
      if (cur !== prev) runOnJS(onTag)(cur);
    },
  );
  // pan reached the start of the loaded history: ask for older candles
  const near = useCallback(() => onNearStart?.(), [onNearStart]);
  useAnimatedReaction(
    () => count.value - vis.value - off.value < 20,
    (cur, prev) => {
      if (cur && cur !== prev) runOnJS(near)();
    },
  );
  useEffect(() => {
    // after older candles arrive the view may still be near the start: ask again
    if (candles.length && w && candles.length - vis.value - off.value < 20) near();
  }, [candles.length, w, near, vis, off]);

  const press = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart((e) => {
      act.value = 1;
      cx.value = e.x;
      cy.value = e.y;
    })
    .onUpdate((e) => {
      cx.value = e.x;
      cy.value = e.y;
    })
    .onFinalize(() => {
      act.value = 0;
    });
  const scroll = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-14, 14])
    .onStart(() => {
      startOff.value = off.value;
    })
    .onUpdate((e) => {
      const cw = width.value / vis.value;
      if (cw > 0) off.value = Math.max(0, Math.min(Math.max(0, count.value - 10), startOff.value + e.translationX / cw));
    });
  const pinch = Gesture.Pinch()
    .onStart(() => {
      startVis.value = vis.value;
    })
    .onUpdate((e) => {
      vis.value = Math.max(MIN_VIS, Math.min(MAX_VIS, startVis.value / Math.max(0.1, e.scale)));
    });
  const gesture = Gesture.Simultaneous(pinch, Gesture.Exclusive(press, scroll));

  const upProps = useAnimatedProps(() => ({ d: geom.value.up }));
  const dnProps = useAnimatedProps(() => ({ d: geom.value.dn }));
  const lastProps = useAnimatedProps(() => ({ y1: geom.value.lastY, y2: geom.value.lastY }));
  const entryProps = useAnimatedProps(() => ({ y1: geom.value.entryY, y2: geom.value.entryY }));
  const entryTxt = useAnimatedProps(() => ({ y: geom.value.entryY - 4 }));
  const vProps = useAnimatedProps(() => {
    const g = geom.value, x = (snapped.value - g.first + 0.5) * g.cw;
    return { x1: x, x2: x, opacity: act.value ? 1 : 0 };
  });
  const hProps = useAnimatedProps(() => {
    const y = Math.max(0, Math.min(heightSv.value, cy.value));
    return { y1: y, y2: y, opacity: act.value ? 1 : 0 };
  });
  const tagStyle = useAnimatedStyle(() => ({ opacity: act.value ? 1 : 0, transform: [{ translateY: Math.max(0, Math.min(heightSv.value, cy.value)) - 9 }] }));
  const tagProps = useAnimatedProps(() => {
    const g = geom.value, t = fmtPx(g.hi - (Math.max(0, Math.min(heightSv.value, cy.value)) / heightSv.value) * (g.hi - g.lo));
    return { text: t, defaultValue: t } as object;
  });

  const activeScale = useMemo(
    () => (candles.length > 0 && jsGeom.hi > jsGeom.lo ? { lo: jsGeom.lo, hi: jsGeom.hi, step: jsGeom.step } : scale),
    [candles.length, jsGeom.lo, jsGeom.hi, jsGeom.step, scale],
  );
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let v = activeScale.lo, i = 0; v <= activeScale.hi + activeScale.step / 2 && i < 12; i++, v = activeScale.lo + i * activeScale.step) out.push(v);
    return out;
  }, [activeScale]);
  const Yj = (v: number) => H - ((v - activeScale.lo) / (activeScale.hi - activeScale.lo)) * H;

  const last = candles[candles.length - 1];
  const shown = sel >= 0 && candles[sel] ? candles[sel] : last;
  const ch = shown ? shown.c - shown.o : 0;
  const dec = shown && shown.c >= 10 ? 2 : 4;
  const isUp = ch >= 0;
  const ohlcColor = isUp ? UP : DN;
  const lastCol = last && last.c >= last.o ? UP : DN;
  const liveBadgeY = Math.max(0, Math.min(H - 20, jsGeom.lastY - 10));

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.topBar}>
        <View style={{ flex: 1, minWidth: 0, minHeight: 34, justifyContent: "center" }}>
          {shown && (
            <>
              <Text style={[styles.rd, { color: colors.muted }]} numberOfLines={1}>
                {when(shown.t, tf)} UTC
              </Text>
              <Text style={[styles.rd, { color: colors.muted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                {[["O", shown.o], ["H", shown.h], ["L", shown.l], ["C", shown.c]].map(([l, v]) => (
                  <Text key={String(l)}>
                    <Text style={{ color: colors.muted }}>{`${l} `}</Text>
                    <Text style={{ color: ohlcColor, fontFamily: font.semibold }}>{`${nf(v as number, dec)}  `}</Text>
                  </Text>
                ))}
                <Text style={{ color: ohlcColor, fontFamily: font.semibold }}>
                  {`${ch >= 0 ? "+" : "−"}${nf(Math.abs(ch), dec)} (${ch >= 0 ? "+" : "−"}${nf(Math.abs((ch / shown.o) * 100), 2)}%)`}
                </Text>
              </Text>
            </>
          )}
        </View>
        <View style={styles.ctrlRow}>
          <Pressable onPress={() => zoomBy(0.75)} style={[styles.ctrlBtn, { backgroundColor: colors.segment, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel="Zoom in candles">
            <Icon name="add" size={16} color="text" />
          </Pressable>
          <Pressable onPress={() => zoomBy(1.33)} style={[styles.ctrlBtn, { backgroundColor: colors.segment, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel="Zoom out candles">
            <Icon name="remove" size={16} color="text" />
          </Pressable>
          {(visState !== DEF_VIS || offState > 0) && (
            <Pressable onPress={resetZoom} style={[styles.ctrlBtn, { backgroundColor: colors.segment, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel="Reset chart zoom">
              <Icon name="sync" size={15} color="text" />
            </Pressable>
          )}
          {onFullScreen && (
            <Pressable onPress={onFullScreen} style={[styles.ctrlBtn, { backgroundColor: colors.segment, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={isFullScreen ? "Exit full screen chart" : "Full screen chart"}>
              <Icon name={isFullScreen ? "close" : "open_in_new"} size={15} color="text" />
            </Pressable>
          )}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="image" accessibilityLabel={`${symbol} candles, ${tf}. Press and hold for the crosshair, drag to pan, pinch to zoom.`}>
        <GestureDetector gesture={gesture}>
          <View style={{ flex: 1, height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
            {!candles.length && (
              <View style={{ height: H, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.muted }}>Loading Phoenix candles</Text>
              </View>
            )}
            {w > 0 && candles.length > 0 && (
              <Svg width={w} height={H}>
                {ticks.map((t) => (
                  <Line key={t} x1={0} x2={w} y1={Yj(t)} y2={Yj(t)} stroke={colors.divider} />
                ))}
                {Platform.OS === "web" ? (
                  <>
                    <Path d={jsGeom.up} fill={UP} stroke={UP} strokeWidth={1} />
                    <Path d={jsGeom.dn} fill={DN} stroke={DN} strokeWidth={1} />
                    <Line x1={0} x2={w} y1={jsGeom.lastY} y2={jsGeom.lastY} stroke={lastCol} strokeDasharray="3 3" />
                  </>
                ) : (
                  <>
                    <AnimatedPath d={jsGeom.up} animatedProps={upProps} fill={UP} stroke={UP} strokeWidth={1} />
                    <AnimatedPath d={jsGeom.dn} animatedProps={dnProps} fill={DN} stroke={DN} strokeWidth={1} />
                    <AnimatedLine y1={jsGeom.lastY} y2={jsGeom.lastY} animatedProps={lastProps} x1={0} x2={w} stroke={lastCol} strokeDasharray="3 3" />
                  </>
                )}
                {entry != null && (
                  <>
                    <AnimatedLine y1={jsGeom.entryY} y2={jsGeom.entryY} animatedProps={entryProps} x1={0} x2={w} stroke={colors.muted} strokeDasharray="4 3" />
                    <AnimatedSvgText y={jsGeom.entryY - 4} animatedProps={entryTxt} x={4} fontSize={11} fill={colors.text} fontFamily={font.regular}>
                      {`${side === "short" ? "Short" : "Long"} entry ${nf(entry, 2)}`}
                    </AnimatedSvgText>
                  </>
                )}
                <AnimatedLine animatedProps={vProps} y1={0} y2={H} stroke={colors.muted} strokeDasharray="3 3" opacity={0} />
                <AnimatedLine animatedProps={hProps} x1={0} x2={w} stroke={colors.muted} strokeDasharray="3 3" opacity={0} />
              </Svg>
            )}
          </View>
        </GestureDetector>
        <View style={{ width: 58, height: H + 16, marginVertical: -8, justifyContent: "space-between", position: "relative" }}>
          {ticks
            .slice()
            .reverse()
            .map((t) => (
              <Text key={t} style={{ fontFamily: font.regular, fontSize: 11, color: colors.muted, textAlign: "right", fontVariant: ["tabular-nums"] }}>
                {candles.length ? nf(t, t >= 1000 ? 2 : 2) : " "}
              </Text>
            ))}
          {last && (
            <View pointerEvents="none" style={[styles.livePill, { top: liveBadgeY + 8, backgroundColor: lastCol }]}>
              <Text style={styles.livePillTxt}>{nf(last.c, last.c >= 10 ? 2 : 4)}</Text>
            </View>
          )}
        </View>
        <Animated.View pointerEvents="none" style={[styles.tag, { backgroundColor: colors.text }, tagStyle]}>
          {Platform.OS === "web" ? (
            <Text style={[styles.tagT, { color: colors.bg }]}>{webTag}</Text>
          ) : (
            <AnimatedInput animatedProps={tagProps} editable={false} pointerEvents="none" style={[styles.tagT, { color: colors.bg }]} />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  ctrlRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ctrlBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rd: { fontFamily: font.regular, fontSize: 11, lineHeight: 16, fontVariant: ["tabular-nums"] },
  livePill: { position: "absolute", right: 0, height: 20, minWidth: 56, paddingHorizontal: 6, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  livePillTxt: { fontFamily: font.semibold, fontSize: 11, color: "#FFFFFF", fontVariant: ["tabular-nums"] },
  tag: { position: "absolute", right: 0, top: 0, height: 18, minWidth: 54, paddingHorizontal: 4, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  tagT: { fontFamily: font.semibold, fontSize: 11, padding: 0, textAlign: "center", fontVariant: ["tabular-nums"] },
});
