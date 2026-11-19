import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  type SharedValue,
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";

import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";

import type { Leg, LegPhase } from "./legs";

/* The approved Phoenix first-time stage (design/perps-flow/first-time.html, phoenix-stage.js `Stage`), ported to Reanimated and
   react-native-svg: one 132 px row  [margin circle] -> [Phoenix trading account card] -> [market circle]. It follows the real legs of a
   first Perps open ("setup" = set up the Phoenix account, "add" = add USDC to Phoenix, "order" = the market order): nothing moves
   before the wallet approved, the card forms while the setup is sent, USDC particles stream in while the deposit is sent, shots run to
   the market while the order is sent, and the position chip pops over the market and docks onto the card once the order confirms.
   A failed leg rests on what really landed (pink outline "Not created", a pink path, or the market "Not placed" with "No position").
   Every moving value is a transform, an opacity or an SVG prop driven on the UI thread. */

export type PhoenixStageData = {
  market: string; // "SOL"
  position: string; // "Long SOL 2x"
  positionLine: string; // "Long SOL 2x · 0.1067 SOL"
  mark: string; // "$187.42"
  usdc: number; // what the add leg moves
  margin: number; // USDC in the margin account before
  phoenix: number; // USDC in Phoenix before
};

const H = 132;
const EASE = Easing.bezier(0.2, 0, 0, 1);
const SPRING = { damping: 11, stiffness: 220 };
const SENT: LegPhase[] = ["send", "confirm", "unsure"];
const ACT: LegPhase[] = ["check", ...SENT];

// the geometry from the sheet body width B (phone width - 32): side zones shrink first, then the card (196 max, 150 min)
function geo(B: number) {
  const side = B >= 370 ? 72 : B >= 340 ? 68 : B >= 320 ? 64 : 56;
  const r = B >= 320 ? 22 : 20;
  const cw = Math.max(150, Math.min(196, B - 2 * side - 12));
  const gap = Math.max(0, (B - 2 * side - cw) / 2);
  const cl = side + gap, ct = 8, ch = 116, cr = cl + cw;
  const cy = 14 + r, sx = side / 2, nx = B - side / 2, ay = ct + 52;
  const a0 = sx + r + 3, a1 = cl - 3, o0 = cr + 3, o1 = nx - r - 3;
  const dep = [a0, cy, (a0 + a1) / 2, cy, (a0 + a1) / 2, ay, a1, ay];
  const ord = [o0, ay, (o0 + o1) / 2, ay, (o0 + o1) / 2, cy, o1, cy];
  const d = (p: number[]) => `M${p[0]} ${p[1]}C${p[2]} ${p[3]} ${p[4]} ${p[5]} ${p[6]} ${p[7]}`;
  return { B, side, r, cw, cl, ct, ch, cy, sx, nx, dep, ord, depD: d(dep), ordD: d(ord), tight: cw < 180 };
}

type Cfg = {
  ph: "outline" | "forming" | "filled" | "docked";
  phBad: boolean;
  ms: "on" | "plan";
  path: "off" | "idle" | "flow" | "bad";
  mk: "idle" | "ping" | "hit" | "bad";
  mkv: string;
  l2: string;
  m: number;
  p: number;
};

// design multileg.js phoenixDriver: the stage flags from the three legs
function cfgOf(legs: Leg[], d: PhoenixStageData, chipDocked: boolean): Cfg {
  const g = (id: string) => legs.find((l) => l.id === id)?.phase ?? "wait";
  const s = g("setup"), a = g("add"), o = g("order");
  const addStarted = !["wait", "queued", "approve", "skipped"].includes(a);
  const ph = s === "done" ? (addStarted || a === "skipped" ? "docked" : "filled") : SENT.includes(s) ? "forming" : "outline";
  const c: Cfg = { ph, phBad: s === "failed", ms: "plan", path: "off", mk: "idle", mkv: d.mark, l2: "No position yet", m: a === "done" ? d.margin - d.usdc : d.margin, p: a === "done" ? d.phoenix + d.usdc : d.phoenix };
  if (ACT.includes(a)) {
    c.ms = "on";
    c.path = SENT.includes(a) ? "flow" : "idle";
  } else if (a === "failed") c.path = "bad";
  if (ACT.includes(o)) c.mk = SENT.includes(o) ? "ping" : "idle";
  else if (o === "failed") Object.assign(c, { mk: "bad", mkv: "Not placed", l2: "No position" });
  else if (o === "done") Object.assign(c, { mk: "hit", mkv: "Filled", l2: chipDocked ? d.positionLine : "No position yet" });
  return c;
}

const bez = (p: number, a: number, b: number, c: number, e: number) => {
  "worklet";
  const u = 1 - p;
  return u * u * u * a + 3 * u * u * p * b + 3 * u * p * p * c + p * p * p * e;
};
const easeIO3 = (c: number) => {
  "worklet";
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// one particle: USDC on the deposit path (5, 620 ms, 150 ms apart) or an order shot to the market (3, 520 ms, 120 ms apart)
function Dot({ clock, i, P, kind, halo, core }: { clock: SharedValue<number>; i: number; P: number[]; kind: "dep" | "ord"; halo: string; core: string }) {
  const pos = useDerivedValue(() => {
    const t = clock.value;
    if (t <= 0) return { x: 0, y: 0, o: 0 };
    const loop = kind === "dep" ? 5 * 150 + 620 + 260 : 1100;
    const dur = kind === "dep" ? 620 : 520;
    const e = ((((t - i * (kind === "dep" ? 150 : 120)) % loop) + loop) % loop) / dur;
    if (e <= 0 || e >= 1) return { x: 0, y: 0, o: 0 };
    const q = easeIO3(e);
    const edge = kind === "dep" ? 0.15 : 0.2;
    return { x: bez(q, P[0], P[2], P[4], P[6]), y: bez(q, P[1], P[3], P[5], P[7]), o: Math.min(1, e / edge, (1 - e) / edge) };
  });
  const h = useAnimatedProps(() => ({ cx: pos.value.x, cy: pos.value.y, opacity: pos.value.o * 0.22 }));
  const c = useAnimatedProps(() => ({ cx: pos.value.x, cy: pos.value.y, opacity: pos.value.o }));
  return (
    <>
      <AnimatedCircle animatedProps={h} r={7} fill={halo} />
      <AnimatedCircle animatedProps={c} r={3} fill={core} />
    </>
  );
}

// a looping clock (ms) while `on`; 0 when off (the particles hide)
function useClock(on: boolean, rm: boolean) {
  const clock = useSharedValue(0);
  useEffect(() => {
    if (on && !rm) {
      clock.value = 1;
      clock.value = withRepeat(withTiming(1 + 60_000, { duration: 60_000, easing: Easing.linear }), -1);
    } else {
      cancelAnimation(clock);
      clock.value = 0;
    }
  }, [on, rm, clock]);
  return clock;
}

const num = (n: number) => {
  "worklet";
  const [i, f] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "−" : ""}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${f}`;
};

// the amounts count (900 ms ease-out cubic) with a short cyan flash, on the UI thread
const AnimatedInput = Animated.createAnimatedComponent(TextInput);
function Count({ to, style, flashColor, baseColor, rm }: { to: number; style: object; flashColor: string; baseColor: string; rm: boolean }) {
  const from = useRef(to);
  const v = useSharedValue(to);
  const flash = useSharedValue(0);
  const [txt, setTxt] = useState(num(to));
  useEffect(() => {
    if (from.current === to) return;
    from.current = to;
    if (rm) {
      v.value = to;
      return;
    }
    flash.value = withSequence(withTiming(1, { duration: 1 }), withDelay(1550, withTiming(0, { duration: 1 })));
    v.value = withTiming(to, { duration: 900, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(setTxt)(num(to));
    });
  }, [to, rm, v, flash]);
  const props = useAnimatedProps(() => {
    const t = num(v.value);
    return { text: t, defaultValue: t } as object;
  });
  const col = useAnimatedStyle(() => ({ color: flash.value > 0.5 ? flashColor : baseColor }));
  return <AnimatedInput editable={false} pointerEvents="none" animatedProps={props} defaultValue={txt} style={[style, styles.count, col]} />;
}

export function PhoenixStage({ legs, data }: { legs: Leg[]; data: PhoenixStageData }) {
  const { colors, isDark } = useTheme();
  const rm = useReducedMotion();
  const [B, setB] = useState(0);
  const g = useMemo(() => geo(Math.round(B || 380)), [B]);

  // the chip: pops over the market 120 ms after the order confirms, docks onto the card's last line at 900 ms
  const orderDone = legs.find((l) => l.id === "order")?.phase === "done";
  const [chipAt, setChipAt] = useState<"off" | "pop" | "dock">(orderDone ? "dock" : "off");
  useEffect(() => {
    if (!orderDone || rm) return;
    const t0 = setTimeout(() => setChipAt((c) => (c === "dock" ? c : "off")), 0);
    const t1 = setTimeout(() => setChipAt((c) => (c === "dock" ? c : "pop")), 120);
    const t2 = setTimeout(() => setChipAt("dock"), 900);
    return () => (clearTimeout(t0), clearTimeout(t1), clearTimeout(t2));
  }, [orderDone, rm]);
  const chip = !orderDone ? "off" : rm ? "dock" : chipAt;
  const c = cfgOf(legs, data, chip === "dock");

  const T = (v: number, ms: number) => (rm ? v : withTiming(v, { duration: ms, easing: EASE }));
  // paths
  const depBase = useSharedValue(0), depLine = useSharedValue(0), ordBase = useSharedValue(0), ordLine = useSharedValue(0);
  // zones (0 hidden, 0.55 the plan, 1 lit)
  const msO = useSharedValue(0.55), mkO = useSharedValue(0.55);
  // card
  const outO = useSharedValue(1), fillO = useSharedValue(0), shimO = useSharedValue(0), sheenO = useSharedValue(0);
  const skelO = useSharedValue(1), nameO = useSharedValue(0), amtO = useSharedValue(0);
  const halo = useSharedValue(0), ok = useSharedValue(0), bad = useSharedValue(0);
  const chipP = useSharedValue(0), chipD = useSharedValue(0);
  const loop = useSharedValue(0); // shimmer / sheen
  const dotO = useSharedValue(1);
  useEffect(() => {
    const flow = c.path === "flow", lit = c.ms === "on";
    depBase.value = T(lit || c.path === "bad" ? 0.8 : 0, 450);
    depLine.value = T(flow || c.path === "bad" ? 1 : 0, 550);
    const mkLit = c.mk === "ping" || c.mk === "hit" || c.mk === "bad";
    ordBase.value = T(mkLit ? 0.8 : 0, 450);
    ordLine.value = T(c.mk === "ping" || c.mk === "hit" || c.mk === "bad" ? 1 : 0, 550);
    msO.value = T(lit || c.path === "bad" ? 1 : 0.55, 400);
    mkO.value = T(mkLit ? 1 : 0.55, 400);
    const formed = c.ph === "filled" || c.ph === "docked";
    outO.value = T(formed ? 0 : 1, 600);
    fillO.value = T(formed ? 1 : 0, 600);
    shimO.value = T(c.ph === "forming" ? 1 : 0, 350);
    sheenO.value = T(flow || c.mk === "ping" ? 1 : 0, 300);
    skelO.value = T(formed ? 0 : 1, 350);
    nameO.value = T(c.ph === "filled" ? 1 : 0, 350);
    amtO.value = T(c.ph === "docked" ? 1 : 0, 350);
    ok.value = rm ? (c.mk === "hit" ? 1 : 0) : withSpring(c.mk === "hit" ? 1 : 0, SPRING);
    bad.value = rm ? (c.mk === "bad" ? 1 : 0) : withSpring(c.mk === "bad" ? 1 : 0, SPRING);
    if (!rm && c.mk === "ping") halo.value = withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 1100, easing: EASE })), -1);
    else if (!rm && c.mk === "hit") halo.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 700, easing: EASE }));
    else {
      cancelAnimation(halo);
      halo.value = 0;
    }
    if (!rm && c.ph === "forming") dotO.value = withRepeat(withSequence(withTiming(0.35, { duration: 500 }), withTiming(1, { duration: 500 })), -1);
    else {
      cancelAnimation(dotO);
      dotO.value = 1;
    }
  }, [c.ph, c.path, c.ms, c.mk, rm]); // eslint-disable-line react-hooks/exhaustive-deps
  const looping = !rm && (c.ph === "forming" || c.path === "flow" || c.mk === "ping");
  useEffect(() => {
    if (looping) {
      loop.value = 0;
      loop.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1);
    } else cancelAnimation(loop);
  }, [looping, loop]);
  useEffect(() => {
    if (chip === "pop") {
      chipP.value = rm ? 1 : withSpring(1, SPRING);
      chipD.value = 0;
    } else if (chip === "dock") {
      chipP.value = 1;
      chipD.value = rm ? 1 : withTiming(1, { duration: 520, easing: EASE });
    } else {
      chipP.value = 0;
      chipD.value = 0;
    }
  }, [chip, rm, chipP, chipD]);

  const depClock = useClock(c.path === "flow", !!rm);
  const ordClock = useClock(c.mk === "ping", !!rm);

  const depBaseP = useAnimatedProps(() => ({ opacity: depBase.value }));
  const ordBaseP = useAnimatedProps(() => ({ opacity: ordBase.value }));
  const depLineP = useAnimatedProps(() => ({ strokeDashoffset: (1 - depLine.value) * 200 }));
  const ordLineP = useAnimatedProps(() => ({ strokeDashoffset: (1 - ordLine.value) * 200 }));
  const msSt = useAnimatedStyle(() => ({ opacity: msO.value, transform: [{ translateY: interpolate(msO.value, [0, 0.55], [6, 0], "clamp") }] }));
  const mkSt = useAnimatedStyle(() => ({ opacity: mkO.value, transform: [{ translateY: interpolate(mkO.value, [0, 0.55], [6, 0], "clamp") }] }));
  const outSt = useAnimatedStyle(() => ({ opacity: outO.value }));
  const fillSt = useAnimatedStyle(() => ({ opacity: fillO.value }));
  const shimSt = useAnimatedStyle(() => ({ opacity: shimO.value, transform: [{ translateX: interpolate(loop.value, [0, 1], [-180, 180]) }] }));
  const sheenSt = useAnimatedStyle(() => ({ opacity: sheenO.value, transform: [{ translateX: interpolate(loop.value, [0, 1], [-g.cw, g.cw]) }] }));
  const skelSt = useAnimatedStyle(() => ({ opacity: skelO.value }));
  const nameSt = useAnimatedStyle(() => ({ opacity: nameO.value }));
  const amtSt = useAnimatedStyle(() => ({ opacity: amtO.value }));
  const haloSt = useAnimatedStyle(() => ({ opacity: halo.value > 0 ? 0.5 * (1 - halo.value) : 0, transform: [{ scale: 0.85 + 0.5 * halo.value }] }));
  const okSt = useAnimatedStyle(() => ({ transform: [{ scale: ok.value }] }));
  const badSt = useAnimatedStyle(() => ({ transform: [{ scale: bad.value }] }));
  const dotSt = useAnimatedStyle(() => ({ opacity: dotO.value }));

  // the chip pops over the market (kept inside the stage) and docks onto the card's last line
  const chipW = Math.min(132, 24 + data.position.length * 7);
  const chipL = Math.max(0, Math.min(g.B - chipW, g.nx - chipW / 2)), chipT = g.cy - 14;
  const dx = g.cl + 14 - chipL, dy = g.ct + g.ch - 30 - chipT;
  const chipSt = useAnimatedStyle(() => ({
    opacity: chipD.value > 0 ? interpolate(chipD.value, [0.55, 1], [1, 0], "clamp") : chipP.value,
    transform: [{ translateX: dx * chipD.value }, { translateY: dy * chipD.value }, { scale: chipD.value > 0 ? 1 - 0.25 * chipD.value : 0.6 + 0.4 * chipP.value }],
  }));

  const formed = c.ph === "filled" || c.ph === "docked";
  const meta = c.ph === "outline" ? (c.phBad ? "Not created" : "Waiting to sign") : c.ph === "forming" ? "Creating on Solana" : c.ph === "filled" ? "Ready just now" : c.l2;
  const metaColor = c.phBad ? colors.onPinkTint : formed ? "rgba(255,255,255,0.85)" : colors.muted;
  const dotColor = c.phBad ? colors.onPinkTint : c.mk === "bad" ? "#FFB0D6" : formed ? "#32EEE2" : c.ph === "forming" ? "#703AE6" : colors.borderControl;
  const ptHalo = isDark ? "#CBB6FA" : "#8D61EB", ptCore = isDark ? "#FFFFFF" : "#703AE6";
  const zone = (x: number) => ({ left: x - g.side / 2, top: 14, width: g.side });
  const small = g.tight ? { fontSize: 11 } : null;
  const circle = { width: g.r * 2, height: g.r * 2, borderRadius: g.r };
  return (
    <View style={{ height: H }} onLayout={(e) => setB(e.nativeEvent.layout.width)} accessible accessibilityLabel={`Phoenix trading account: ${meta}`}>
      {B > 0 && (
        <>
          <Svg width={g.B} height={H} style={StyleSheet.absoluteFill}>
            <AnimatedPath animatedProps={depBaseP} d={g.depD} fill="none" stroke={colors.borderControl} strokeWidth={2} strokeLinecap="round" strokeDasharray={[0, 6]} />
            <AnimatedPath animatedProps={depLineP} d={g.depD} fill="none" stroke={c.path === "bad" ? colors.onPinkTint : colors.link} opacity={c.path === "bad" ? 0.6 : 0.9} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={[200, 200]} />
            <AnimatedPath animatedProps={ordBaseP} d={g.ordD} fill="none" stroke={colors.borderControl} strokeWidth={2} strokeLinecap="round" strokeDasharray={[0, 6]} />
            <AnimatedPath animatedProps={ordLineP} d={g.ordD} fill="none" stroke={c.mk === "bad" ? colors.onPinkTint : colors.link} opacity={c.mk === "bad" ? 0.6 : c.mk === "hit" ? 0.35 : 0.9} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={[200, 200]} />
            {[0, 1, 2, 3, 4].map((i) => (
              <Dot key={`d${i}`} clock={depClock} i={i} P={g.dep} kind="dep" halo={ptHalo} core={ptCore} />
            ))}
            {[0, 1, 2].map((i) => (
              <Dot key={`o${i}`} clock={ordClock} i={i} P={g.ord} kind="ord" halo={ptHalo} core={ptCore} />
            ))}
          </Svg>

          {/* the margin account: dimmed as the plan, lit while USDC leaves it */}
          <Animated.View style={[styles.zone, zone(g.sx), msSt]}>
            <View style={[circle, { overflow: "hidden", alignItems: "center", justifyContent: "center" }]}>
              <LinearGradient colors={families.margin.h} locations={[0, 0.42, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Icon name="account_balance" size={g.r - 2} color="#FFFFFF" />
            </View>
            <Text style={[styles.zl, small, { color: colors.text }]}>Margin</Text>
            <View style={styles.zvRow}>
              <Count to={c.m} rm={!!rm} style={[styles.zv, small]} baseColor={colors.muted} flashColor={colors.link} />
              <Text style={[styles.zv, small, { color: colors.muted }]}> USDC</Text>
            </View>
          </Animated.View>

          {/* the Phoenix trading account: the hero; opaque, above every path and particle */}
          <View style={[styles.pc, { left: g.cl, top: g.ct, width: g.cw, height: g.ch, backgroundColor: colors.surface }]}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.out, { borderColor: c.phBad ? colors.onPinkTint : c.ph === "forming" ? "#8D61EB" : colors.borderControl }, outSt]} />
            <Animated.View style={[StyleSheet.absoluteFill, fillSt]}>
              <LinearGradient colors={families.perps.h} locations={[0, 0.42, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.shim, shimSt]}>
              <LinearGradient colors={["transparent", "rgba(141,97,235,0.26)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, sheenSt]}>
              <LinearGradient colors={["transparent", "rgba(255,255,255,0.28)", "transparent"]} start={{ x: 0.35, y: 0 }} end={{ x: 0.65, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <View style={styles.pcIn}>
              <View style={styles.bTop}>
                <Text style={[styles.bK, { color: formed ? "rgba(255,255,255,0.85)" : colors.muted }]}>Phoenix</Text>
                <View style={[styles.bChip, { backgroundColor: formed ? "rgba(255,255,255,0.18)" : colors.divider }]}>
                  <Text style={[styles.bChipT, { color: formed ? "#FFFFFF" : colors.muted }]}>Perps</Text>
                </View>
              </View>
              <View style={styles.bMid}>
                <Animated.View style={[StyleSheet.absoluteFill, styles.skelRow, skelSt]}>
                  <View style={[styles.skel, { width: 96, backgroundColor: colors.border }]} />
                  <View style={[styles.skel, { width: 36, backgroundColor: colors.border, opacity: 0.6 }]} />
                </Animated.View>
                <Animated.Text style={[StyleSheet.absoluteFill, styles.bName, g.tight && { fontSize: 15 }, nameSt]} numberOfLines={1}>Trading account</Animated.Text>
                <Animated.View style={[StyleSheet.absoluteFill, styles.amtRow, amtSt]}>
                  <Count to={c.p} rm={!!rm} style={[styles.bAmt, g.tight && { fontSize: 18 }]} baseColor="#FFFFFF" flashColor="#BFF6FA" />
                  <Text style={styles.bUnit}>USDC</Text>
                </Animated.View>
              </View>
              <View style={styles.bMeta}>
                <Animated.View style={[styles.bDot, { backgroundColor: dotColor }, c.ph === "forming" && dotSt]} />
                <Text style={[styles.bMetaT, small, { color: metaColor }]} numberOfLines={2}>{meta}</Text>
              </View>
            </View>
          </View>

          {/* the market: dimmed as the plan, lit while the order is sent; a check when it fills, a cross when it did not */}
          <Animated.View style={[styles.zone, zone(g.nx), mkSt]}>
            <View style={circle}>
              <Animated.View style={[styles.halo, { borderRadius: g.r + 6 }, haloSt]} />
              <View style={[StyleSheet.absoluteFill, styles.mkC, { borderRadius: g.r, backgroundColor: colors.bg, borderColor: c.mk === "bad" ? colors.onPinkTint : c.mk === "ping" || c.mk === "hit" ? "#703AE6" : colors.border }]}>
                <Icon name="candlestick_chart" size={g.r - 2} />
              </View>
              <Animated.View style={[styles.badge, { backgroundColor: "#703AE6", borderColor: colors.surface }, okSt]}>
                <Icon name="check" size={12} color="#FFFFFF" />
              </Animated.View>
              <Animated.View style={[styles.badge, { backgroundColor: colors.pinkTint, borderColor: colors.surface }, badSt]}>
                <Icon name="close" size={12} color={colors.onPinkTint} />
              </Animated.View>
            </View>
            <Text style={[styles.zl, small, { color: colors.text }]}>{`${data.market}-PERP`}</Text>
            <Text style={[styles.zv, small, { color: c.mk === "bad" ? colors.onPinkTint : colors.muted }]}>{c.mkv}</Text>
          </Animated.View>

          <Animated.View pointerEvents="none" style={[styles.chip, { left: chipL, top: chipT, width: chipW, borderColor: colors.surface }, chipSt]}>
            <Text style={styles.chipT} numberOfLines={1}>{data.position}</Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: { position: "absolute", alignItems: "center", gap: 4, zIndex: 2 },
  zl: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, marginTop: 2, textAlign: "center" },
  zvRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap" },
  zv: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, textAlign: "center", fontVariant: ["tabular-nums"] },
  count: { padding: 0, margin: 0, includeFontPadding: false },
  pc: { position: "absolute", borderRadius: 16, overflow: "hidden", zIndex: 2 },
  out: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 16 },
  shim: { position: "absolute", top: 0, bottom: 0, left: 0, width: 90 },
  pcIn: { ...StyleSheet.absoluteFill, paddingVertical: 12, paddingHorizontal: 14, justifyContent: "space-between" },
  bTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bK: { fontFamily: font.semibold, fontSize: 13 },
  bChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  bChipT: { fontFamily: font.semibold, fontSize: 11 },
  bMid: { height: 28 },
  skelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  skel: { height: 12, borderRadius: 6 },
  bName: { fontFamily: font.semibold, fontSize: 17, lineHeight: 28, color: "#FFFFFF" },
  amtRow: { flexDirection: "row", alignItems: "center" },
  bAmt: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28, color: "#FFFFFF", fontVariant: ["tabular-nums"] },
  bUnit: { fontFamily: font.semibold, fontSize: 12, color: "#FFFFFF", marginLeft: 4 },
  bMeta: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  bDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  bMetaT: { flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 15 },
  halo: { position: "absolute", left: -6, top: -6, right: -6, bottom: -6, backgroundColor: "rgba(112,58,230,0.18)" },
  mkC: { borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", right: -4, bottom: -4, width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  chip: { position: "absolute", height: 28, paddingHorizontal: 12, borderRadius: 14, borderWidth: 2, backgroundColor: "#703AE6", alignItems: "center", justifyContent: "center", zIndex: 4 },
  chipT: { fontFamily: font.semibold, fontSize: 12, color: "#FFFFFF" },
});
