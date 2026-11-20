import { type ReactNode, useId, useMemo, useRef, useState } from "react";
import { type HostInstance, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

import { curvePoints, rateAt, type RateKind } from "@/chain/solana/rate-curve";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard } from "@/components/ui/kit";
import { pct } from "@/format";
import type { Pool } from "@/sample/data";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";

/* Lend pool Analytics tab (design/lend-pool analytics()): a Deposit / Borrow APY menu, the current value, "At x% utilization" and the
   pool's own rate curve, computed from its Reserve's coefficients with the website's exact maths (chain/solana/rate-curve.ts). Drag
   sideways to read any utilization; a dashed "Now" marker sits at the current one. The expand button opens the same chart full
   screen. The menu and the full screen chart are modals over the screen, so the page under them keeps its scroll position. */
const KIND: Record<RateKind, string> = { dep: "Deposit APY", bor: "Borrow APY" };
const PL = 2, PR = 42, PT = 30, PB = 24, N = 200;
// Material Symbols "fullscreen" (24 px viewBox): not in the app's icon set.
const EXPAND = "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z";

// Top of the y axis: four even steps of 1, 1.5, 2, 2.5, 3, 5 or 7.5 x a power of ten that cover the curve's highest rate.
function niceTop(maxPct: number) {
  if (!(maxPct > 0)) return { step: 1, top: 4 };
  const raw = maxPct / 4, p = 10 ** Math.floor(Math.log10(raw));
  const k = [1, 1.5, 2, 2.5, 3, 5, 7.5, 10].find((m) => m * p >= raw - 1e-9) ?? 10;
  return { step: k * p, top: k * p * 4 };
}
const clamp01 = (u: number) => Math.max(0, Math.min(1, u));

export function PoolAnalytics({ p }: { p: Pool }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [kind, setKind] = useState<RateKind>("dep");
  const [full, setFull] = useState(false);
  const [fullH, setFullH] = useState(0);
  if (!p.live || !p.curveWad) return <EmptyCard title="Rates unavailable right now" module="earn" always />;
  const color = kind === "bor" ? colors.link : colors.positive;
  return (
    <>
      <Card style={styles.card}>
        <ChartHead p={p} kind={kind} onKind={setKind}>
          <Pressable onPress={() => setFull(true)} style={styles.hit} accessibilityRole="button" accessibilityLabel="Expand chart">
            <View style={[styles.xp, { backgroundColor: colors.segment, borderColor: colors.border }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d={EXPAND} fill={colors.text} />
              </Svg>
            </View>
          </Pressable>
        </ChartHead>
        <RateChart p={p} kind={kind} h={width < 400 ? 210 : 230} ring={colors.surface} pan="x" />
        <View style={styles.hint}>
          <Icon name="swap_horiz" size={16} color="muted" />
          <Text style={[styles.cap, { color: colors.muted }]}>Drag to read any utilization</Text>
        </View>
      </Card>
      <Modal visible={full} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setFull(false)}>
        {/* a modal is its own native root: gestures inside it need their own handler root */}
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={[styles.full, { backgroundColor: colors.bg }]}>
            <ChartHead p={p} kind={kind} onKind={setKind}>
              <Pressable onPress={() => setFull(false)} style={styles.hit} accessibilityRole="button" accessibilityLabel="Close full screen chart">
                <View style={[styles.xb, { backgroundColor: colors.surface }]}>
                  <Icon name="close" size={22} color="text" />
                </View>
              </Pressable>
            </ChartHead>
            <View style={{ flex: 1, minHeight: 0 }} onLayout={(e) => setFullH(e.nativeEvent.layout.height)}>
              {fullH > 0 && <RateChart p={p} kind={kind} h={Math.max(240, fullH - 10)} ring={colors.bg} pan="any" />}
            </View>
            <View style={styles.legend}>
              <LegendKey color={color} label={KIND[kind]} />
              <LegendKey color={colors.negative} label="Now" dashed />
            </View>
          </SafeAreaView>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

// Menu, the right-hand button, the current value and its utilization.
function ChartHead({ p, kind, onKind, children }: { p: Pool; kind: RateKind; onKind: (k: RateKind) => void; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <>
      <View style={styles.head}>
        <KindMenu kind={kind} onChange={onKind} />
        {children}
      </View>
      <Text style={[styles.av, { color: colors.text }]}>{pct(kind === "bor" ? p.borA : p.supA)}</Text>
      <Text style={[styles.cap, styles.ats, { color: colors.muted }]}>At {pct(p.util)} utilization</Text>
    </>
  );
}

// Deposit / Borrow APY dropdown. The list opens in a transparent modal under the button (measured in the window): a tap outside or
// Back closes it, and nothing on the page re-renders or moves. Its own modal rather than the shared openMenu, because the shared one
// draws in the app's root and would sit behind the full screen chart.
function KindMenu({ kind, onChange }: { kind: RateKind; onChange: (k: RateKind) => void }) {
  const { colors, isDark } = useTheme();
  const ref = useRef<HostInstance>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const open = () => ref.current?.measureInWindow((x, y, _w, h) => setAt({ x, y: y + h }));
  const close = () => setAt(null);
  return (
    <>
      <Pressable ref={ref} onPress={open} style={styles.dd} accessibilityRole="button" accessibilityState={{ expanded: !!at }} accessibilityLabel={`${KIND[kind]}, change rate`}>
        <Text style={[styles.ddT, { color: colors.text }]}>{KIND[kind]}</Text>
        <View style={at ? styles.flip : undefined}>
          <Icon name="expand_more" size={20} color="text" />
        </View>
      </Pressable>
      <Modal visible={!!at} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close menu" />
        {at && (
          <View style={[styles.menu, { top: at.y - 2, left: at.x, backgroundColor: isDark ? colors.segmentActive : colors.surface }]} accessibilityRole="menu">
            {(["dep", "bor"] as const).map((k) => {
              const on = k === kind;
              return (
                <Pressable
                  key={k}
                  onPress={() => {
                    onChange(k);
                    close();
                  }}
                  style={[styles.opt, on && { backgroundColor: colors.purpleTint }]}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.optT, { color: on ? colors.onPurpleTint : colors.text }]}>{KIND[k]}</Text>
                  {on && <Icon name="check" size={18} color={colors.onPurpleTint} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </Modal>
    </>
  );
}

// The curve: y axis on the right in four steps, x axis 0 / 33 / 67 / 100%, the Now marker, and a crosshair with a readout while a
// finger is on it. pan "x" (on the page): only a sideways drag reads, a vertical one still scrolls; "any" (full screen): any drag.
function RateChart({ p, kind, h, ring, pan }: { p: Pool; kind: RateKind; h: number; ring: string; pan: "x" | "any" }) {
  const { colors, isDark } = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [chipW, setChipW] = useState(0);
  const gid = "rc" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const curve = p.curveWad!, rf = p.rfBps ?? 0;
  const pts = useMemo(() => curvePoints(curve, rf, kind, N), [curve, rf, kind]);
  const color = kind === "bor" ? colors.link : colors.positive;
  const pw = Math.max(0, w - PL - PR), ph = h - PT - PB;
  const { step, top } = niceTop(pts[N][1] * 100);
  const X = (u: number) => PL + u * pw;
  const Y = (v: number) => PT + ph - (Math.min(v, top) / top) * ph;
  const line = pts.map(([u, v], i) => `${i ? "L" : "M"}${X(u).toFixed(1)} ${Y(v * 100).toFixed(1)}`).join("");
  const area = `${line}L${X(1).toFixed(1)} ${Y(0).toFixed(1)}L${X(0).toFixed(1)} ${Y(0).toFixed(1)}Z`;
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  const uNow = clamp01(p.util / 100), vNow = kind === "bor" ? p.borA : p.supA;

  const read = (x: number) => pw > 0 && setSel(clamp01((x - PL) / pw));
  const clear = () => setSel(null);
  const base = pan === "x" ? Gesture.Pan().activeOffsetX([-8, 8]).failOffsetY([-12, 12]) : Gesture.Pan().minDistance(0);
  const gesture = base
    .onStart((e) => runOnJS(read)(e.x))
    .onUpdate((e) => runOnJS(read)(e.x))
    .onFinalize(() => runOnJS(clear)());

  const selV = sel == null ? 0 : rateAt(curve, rf, kind, sel) * 100;
  return (
    <GestureDetector gesture={gesture}>
      <View style={{ height: h, marginTop: 10 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityRole="image" accessibilityLabel={`${KIND[kind]} rate curve, drag to read`}>
        {w > 0 && (
          <Svg width={w} height={h} pointerEvents="none">
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.28} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {ticks.map((t) => (
              <Line key={"g" + t} x1={PL} x2={PL + pw} y1={Y(t)} y2={Y(t)} stroke={colors.border} strokeWidth={1} />
            ))}
            {ticks.map((t) => (
              <SvgText key={"y" + t} x={w - 2} y={Y(t) + 4} textAnchor="end" fontSize={11} fontFamily={font.regular} fill={colors.muted}>
                {`${+t.toFixed(2)}%`}
              </SvgText>
            ))}
            {([[0, "0%", "start"], [1 / 3, "33%", "middle"], [2 / 3, "67%", "middle"], [1, "100%", "end"]] as const).map(([u, t, a]) => (
              <SvgText key={t} x={X(u)} y={h - 6} textAnchor={a} fontSize={11} fontFamily={font.regular} fill={colors.muted}>
                {t}
              </SvgText>
            ))}
            <Path d={area} fill={`url(#${gid})`} />
            <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
            <Line x1={X(uNow)} x2={X(uNow)} y1={PT} y2={PT + ph} stroke={colors.negative} strokeWidth={1.5} strokeDasharray="4 4" />
            <Circle cx={X(uNow)} cy={Y(vNow)} r={5} fill={colors.negative} stroke={ring} strokeWidth={2} />
            <SvgText x={X(uNow)} y={PT - 8} textAnchor={uNow < 0.08 ? "start" : uNow > 0.92 ? "end" : "middle"} fontSize={11} fontFamily={font.semibold} fill={colors.negative}>
              Now
            </SvgText>
            {sel != null && (
              <>
                <Line x1={X(sel)} x2={X(sel)} y1={PT} y2={PT + ph} stroke={colors.borderControl} strokeWidth={1} />
                <Circle cx={X(sel)} cy={Y(selV)} r={6} fill={color} stroke={ring} strokeWidth={2} />
              </>
            )}
          </Svg>
        )}
        {sel != null && w > 0 && (
          <View
            pointerEvents="none"
            onLayout={(e) => setChipW(e.nativeEvent.layout.width)}
            style={[styles.chip, { left: Math.max(0, Math.min(w - chipW, X(sel) - chipW / 2)), backgroundColor: isDark ? colors.segmentActive : colors.bg, borderColor: colors.border }]}
          >
            <Text style={[styles.cap, { color: colors.text }]} numberOfLines={1}>
              <Text style={styles.chipV}>{pct(selV)}</Text> at {(sel * 100).toFixed(1)}% utilization
            </Text>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

function LegendKey({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.lk}>
      <Svg width={14} height={4}>
        <Line x1={0} x2={14} y1={2} y2={2} stroke={color} strokeWidth={2.5} strokeDasharray={dashed ? "3 2" : undefined} />
      </Svg>
      <Text style={[styles.cap, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 0, paddingTop: 8, paddingBottom: 14 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: -4 },
  dd: { height: 48, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4, borderRadius: 12 },
  ddT: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  flip: { transform: [{ rotate: "180deg" }] },
  hit: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  xp: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  xb: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  av: { fontFamily: font.semibold, fontSize: 24, lineHeight: 32, marginTop: -2, fontVariant: ["tabular-nums"] },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  ats: { marginTop: 2 },
  hint: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  chip: { position: "absolute", top: 0, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 4 },
  chipV: { fontFamily: font.semibold, fontSize: 13 },
  menu: { position: "absolute", minWidth: 180, borderRadius: 14, padding: 6, elevation: 8, shadowColor: "#000000", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  opt: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 48, paddingHorizontal: 12, borderRadius: 10 },
  optT: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20 },
  full: { flex: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 6 },
  lk: { flexDirection: "row", alignItems: "center", gap: 6 },
});
