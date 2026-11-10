import { type ReactNode, type RefObject, useEffect, useId, useRef, useState } from "react";
import { type HostInstance, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Line, Pattern, Rect } from "react-native-svg";

import { nf, usd } from "@/format";
import { useTheme } from "@/theme/use-theme";
import { type Family, font } from "@/theme/tokens";
import { TOK } from "@/sample/data";
import { openMenu, openTip } from "@/ui/overlay";

import { TokenLogo, VannaMark } from "./brand";
import { Icon } from "./ui/icon";
import { haptic } from "@/ui/haptics";

/* Form pieces shared by Margin, Spot, Perps and Farm (design margin.js amtField / pcts / seg2 / prev / levSlider). */

export const cleanAmt = (t: string, d = 6) => {
  let v = t.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const i = v.indexOf(".");
  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "").slice(0, d);
  return v;
};

// Token dropdown (design tokDD): anchored under its field, as wide as the field; logo, symbol, name and balance, the current one tinted.
export function TokenMenu({ syms, cur, meta, onPick, close }: { syms: string[]; cur: string; meta?: (s: string) => string; onPick: (s: string) => void; close: () => void }) {
  const { colors } = useTheme();
  return (
    <>
      {syms.map((s) => {
        const on = s === cur;
        return (
          <Pressable key={s} onPress={() => (onPick(s), close())} style={[styles.mi, on && { backgroundColor: colors.purpleTint }]} accessibilityRole="menuitem" accessibilityState={{ selected: on }}>
            <TokenLogo sym={s} size={32} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>{s}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.muted }} numberOfLines={1}>{TOK[s]?.name ?? s}</Text>
            </View>
            {meta && <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.text, fontVariant: ["tabular-nums"] }}>{meta(s)}</Text>}
          </Pressable>
        );
      })}
    </>
  );
}

// Token pill that opens the dropdown under its own chip.
export function TokenPill({
  sym,
  syms,
  onSym,
  meta,
}: {
  sym: string;
  syms?: string[];
  onSym?: (s: string) => void;
  meta?: (s: string) => string;
  anchor?: RefObject<HostInstance | null>;
}) {
  const { colors } = useTheme();
  const own = useRef<HostInstance>(null);
  const can = !!(syms && onSym && syms.length > 1);
  const pick = () => {
    if (!can) return;
    openMenu(
      own,
      (close) => <TokenMenu syms={syms!} cur={sym} meta={meta} onPick={onSym!} close={close} />,
      { width: 280 }
    );
  };
  return (
    <Pressable ref={own} onPress={pick} disabled={!can} style={[styles.tp, { backgroundColor: colors.surface }]} accessibilityRole="button" accessibilityLabel={`Token ${sym}${can ? ", change" : ""}`}>
      <TokenLogo sym={sym} size={24} />
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>{sym}</Text>
      {can && <Icon name="expand_more" size={18} />}
    </Pressable>
  );
}

// Amount input with a token pill (tap = dropdown anchored under the chip), the USD value, and an optional footer
// (balance + quick fills, as the design's deposit field).
export function AmountField({
  value, onChange, sym, onSym, syms, meta, usdValue, label, bad, right, footer,
}: {
  value: string; onChange: (v: string) => void; sym: string; onSym?: (s: string) => void; syms?: string[]; meta?: (s: string) => string;
  usdValue?: number; label: string; bad?: boolean; right?: string; footer?: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.af, { backgroundColor: colors.bg, borderColor: bad ? colors.negative : "transparent" }]}>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(cleanAmt(t))}
          placeholder="0"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          accessibilityLabel={label}
          style={[styles.in, { color: bad ? colors.negative : colors.text }]}
        />
        <TokenPill
          sym={sym}
          syms={syms}
          onSym={onSym}
          meta={meta}
        />
      </View>
      {(usdValue != null && usdValue > 0) || right ? (
        <View style={styles.row}>
          <Text style={[styles.cap, { color: colors.muted, flex: 1 }]}>{usdValue != null && usdValue > 0 ? "~" + usd(usdValue) : " "}</Text>
          {right && <Text style={[styles.cap, { color: colors.muted }]}>{right}</Text>}
        </View>
      ) : null}
      {footer}
    </View>
  );
}

// Quick fills (10% / 25% / 50% / Max); small = the compact chips that sit inside a field.
export function PctChips({ value, onPick, items = [25, 50, 75, 100], small }: { value?: number; onPick: (p: number) => void; items?: number[]; small?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pcts, small && { gap: 4 }]}>
      {items.map((p) => {
        const on = value === p;
        return (
          <Pressable key={p} onPress={() => (haptic.tap(), onPick(p))} style={[small ? styles.pcS : styles.pc, { borderColor: on ? colors.link : colors.borderControl, backgroundColor: on ? colors.purpleTint : "transparent" }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Text style={{ fontFamily: font.semibold, fontSize: small ? 12 : 13, color: on ? colors.onPurpleTint : colors.text }}>{p === 100 ? "Max" : `${p}%`}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Compact two-way switch (Wallet | Margin): sized to its labels, the thumb slides to the chosen one; full = fills the row.
export function Seg2<K extends string>({ items, value, onChange, label, full, accent }: { items: [K, string][]; value: K; onChange: (k: K) => void; label: string; full?: boolean; accent?: string }) {
  const { colors } = useTheme();
  const [boxes, setBoxes] = useState<Record<string, { x: number; w: number }>>({});
  const b = boxes[value];
  const x = useSharedValue(0), w = useSharedValue(0);
  const [placed, setPlaced] = useState(false);
  useEffect(() => {
    if (!b || !placed) return;
    x.set(withTiming(b.x, { duration: 220, easing: Easing.bezier(0.2, 0, 0, 1) }));
    w.set(withTiming(b.w, { duration: 220, easing: Easing.bezier(0.2, 0, 0, 1) }));
  }, [b, placed, x, w]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value }));
  return (
    <View style={[styles.seg, { backgroundColor: colors.segment }, full ? { alignSelf: "stretch" } : { alignSelf: "flex-start" }]} accessibilityRole="tablist" accessibilityLabel={label}>
      {placed && <Animated.View style={[styles.segThumb, { backgroundColor: accent ?? colors.segmentActive }, st]} />}
      {items.map(([k, l]) => (
        <Pressable
          key={k}
          onLayout={(e) => {
            const { x: lx, width } = e.nativeEvent.layout;
            // first measurement of the chosen item: put the thumb there without animating
            if (!placed && k === value) {
              x.set(lx);
              w.set(width);
              setPlaced(true);
            }
            setBoxes((p) => (p[k]?.x === lx && p[k]?.w === width ? p : { ...p, [k]: { x: lx, w: width } }));
          }}
          onPress={() => onChange(k)}
          style={[styles.segI, full && { flex: 1 }]}
          accessibilityRole="tab"
          accessibilityState={{ selected: k === value }}
        >
          <Text style={{ fontFamily: font.semibold, fontSize: accent ? 15 : 13, color: k === value ? (accent ? "#FFFFFF" : colors.text) : colors.muted }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// Info icon with a tooltip (design tip()).
export function InfoTip({ text }: { text: string }) {
  const ref = useRef<HostInstance>(null);
  return (
    <Pressable ref={ref} onPress={() => openTip(ref, text)} hitSlop={10} accessibilityRole="button" accessibilityLabel={text}>
      <Icon name="info" size={16} color="muted" />
    </Pressable>
  );
}

// Before → after rows (design prev / pr).
export function Preview({ rows }: { rows: [string, string, string, ("pos" | "neg" | "warn" | "")?][] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.prev, { backgroundColor: colors.bg }]}>
      {rows.map(([l, a, b, t], i) => (
        <View key={l} style={[styles.pr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.muted }}>{l}</Text>
          <Text style={[styles.prv, { color: colors.muted }]}>{a}</Text>
          <Icon name="arrow_forward" size={14} color="muted" />
          <Text style={[styles.prv, { color: t === "neg" ? colors.negative : t === "warn" ? colors.warning : t === "pos" ? colors.positive : colors.text }]}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

export const hfTone = (h: number): "pos" | "warn" | "neg" | "" => (!isFinite(h) || h >= 1.5 ? "pos" : h > 1.1 ? "warn" : "neg");

// Leverage slider (design levSlider, sized as the shipped app's LeverageSlider): 1x..cap with marks, a hatched zone past the safe max,
// the Vanna mark on a ringed disc as the thumb, - / + steppers, Safe max and Use max.
const THUMB = 32, TRACK_TOP = 19, DOT = 14;
export function LevSlider({ value, max, cap = 10, onChange, label = "Leverage", marks = [1, 2, 4, 6, 8, 10], stepped, tip }: { value: number; max: number; cap?: number; onChange: (v: number) => void; fam?: Family; label?: string; marks?: number[]; stepped?: boolean; tip?: string }) {
  const { colors, isDark } = useTheme();
  const [w, setW] = useState(0);
  const pc = (v: number) => (v - 1) / (cap - 1);
  const x = useSharedValue(0);
  const span = useSharedValue(0);
  useEffect(() => {
    span.value = w;
    x.value = withTiming(pc(Math.min(value, max)) * w, { duration: 140, easing: Easing.out(Easing.cubic) });
  }, [value, max, w, x, span]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (px: number) => {
    const v = 1 + Math.max(0, Math.min(1, px / Math.max(1, w))) * (cap - 1);
    // stepped (Perps): snaps to 0.5x increments (1x, 1.5x, 2x, 2.5x, 3x...), matching web order-panel.tsx
    const nv = Math.max(1, Math.min(max, stepped ? Math.round(v * 2) / 2 : Math.round(v * 20) / 20));
    if (Math.round(nv * 2) !== Math.round(value * 2)) haptic.tick();
    onChange(nv);
  };
  const pan = Gesture.Pan()
    .minDistance(2)
    .onBegin((e) => runOnJS(set)(e.x))
    .onUpdate((e) => runOnJS(set)(e.x));
  const tap = Gesture.Tap().onEnd((e) => runOnJS(set)(e.x));
  const fill = useAnimatedStyle(() => ({ width: x.value }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - THUMB / 2 }] }));
  // web: Reanimated's timing on these views can stall, so the thumb and fill follow the value directly there
  const at = pc(Math.min(value, max)) * w;
  const fillWeb = Platform.OS === "web" ? { width: at } : null;
  const thumbWeb = Platform.OS === "web" ? { transform: [{ translateX: at - THUMB / 2 }] } : null;
  // Steppers: in stepped mode (Perps), move by 0.5x (1x -> 1.5x -> 2x -> 2.5x -> 3x); otherwise 1x
  const step = (d: number) => {
    haptic.tick();
    if (stepped) {
      const next = Math.round((value + d * 0.5) * 2) / 2;
      onChange(Math.max(1, Math.min(max, next)));
    } else {
      onChange(Math.max(1, Math.min(max, d > 0 ? Math.floor(value + 1e-9) + 1 : Math.ceil(value - 1e-9) - 1)));
    }
  };
  const fmtLev = (v: number) => (stepped ? `${Number(v.toFixed(1))}x` : `${nf(v, 2)}x`);
  const hatchX = pc(max) * w;
  const hid = "hatch" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.lvh}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.eb, { color: colors.text }]}>{label.toUpperCase()}</Text>
          {tip && <InfoTip text={tip} />}
        </View>
        <View style={styles.step}>
          <Pressable onPress={() => step(-1)} disabled={value <= 1} style={[styles.stp, { backgroundColor: colors.segment }]} accessibilityRole="button" accessibilityLabel="Less leverage">
            <Icon name="remove" size={22} color={value <= 1 ? colors.disabled : colors.text} />
          </Pressable>
          <Text style={[styles.lv, { color: colors.text }]}>{fmtLev(value)}</Text>
          <Pressable onPress={() => step(1)} disabled={value >= max} style={[styles.stp, { backgroundColor: colors.segment }]} accessibilityRole="button" accessibilityLabel="More leverage">
            <Icon name="add" size={22} color={value >= max ? colors.disabled : colors.text} />
          </Pressable>
        </View>
      </View>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View style={styles.trk} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 1, max, now: value, text: `${nf(value, 2)}x` }}>
          <View style={[styles.bg, { backgroundColor: colors.divider }]} />
          {w > 0 && max < cap && (
            <Svg style={{ position: "absolute", left: hatchX, top: TRACK_TOP - 2 }} width={Math.max(0, w - hatchX)} height={8}>
              <Defs>
                <Pattern id={hid} width={6} height={8} patternUnits="userSpaceOnUse">
                  <Line x1={0} y1={8} x2={6} y2={0} stroke={colors.borderControl} strokeWidth={1.5} />
                </Pattern>
              </Defs>
              <Rect width={Math.max(0, w - hatchX)} height={8} fill={`url(#${hid})`} />
            </Svg>
          )}
          <Animated.View style={[styles.fl, fillWeb ?? fill]}>
            <LinearGradient colors={["#FC5457", "#703AE6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
          </Animated.View>
          {marks.map((m) => (
            <Pressable
              key={m}
              onPress={() => onChange(Math.min(max, m))}
              accessibilityRole="button"
              accessibilityLabel={`${m}X leverage`}
              style={[styles.mkHit, { left: pc(m) * w - 22 }]}
            >
              <View style={[styles.mk, { borderColor: colors.surface, backgroundColor: m <= value + 1e-9 ? "#703AE6" : m > max ? colors.divider : colors.border }]} />
              <Text style={{ fontFamily: font.semibold, fontSize: 12, color: Math.abs(m - value) < 1e-9 ? colors.link : colors.muted }}>{m}X</Text>
            </Pressable>
          ))}
          <Animated.View pointerEvents="none" style={[styles.th, { backgroundColor: isDark ? colors.bg : "#FFFFFF" }, thumbWeb ?? thumb]}>
            <VannaMark size={22} />
          </Animated.View>
        </View>
      </GestureDetector>
      <View style={styles.lvh}>
        <Text style={[styles.cap, { color: colors.muted }]}>
          Safe max <Text style={{ fontFamily: font.semibold, color: colors.text }}>{nf(max, 2)}x</Text>
        </Text>
        <Pressable onPress={() => (haptic.tap(), onChange(max))} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Max leverage, ${nf(max, 2)}x`} style={[styles.maxB, { borderColor: colors.borderControl }]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.text }}>Max</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Eyebrow({ children, right, tip }: { children: string; right?: ReactNode; tip?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.lvh}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={[styles.eb, { color: colors.text }]}>{children.toUpperCase()}</Text>
        {tip && <InfoTip text={tip} />}
      </View>
      {right}
    </View>
  );
}

export function Note({ text, tone = "warn" }: { text: string; tone?: "warn" | "err" }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.note, { backgroundColor: tone === "err" ? colors.pinkTint : colors.bg }]} accessibilityRole="alert">
      <Icon name="warning" size={18} color={tone === "err" ? colors.onPinkTint : colors.warning} />
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: tone === "err" ? colors.onPinkTint : colors.text }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  af: { borderRadius: 16, padding: 14, gap: 4, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  in: { flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 28, paddingVertical: 2, fontVariant: ["tabular-nums"] },
  tp: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingLeft: 8, paddingRight: 10, borderRadius: 20 },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  mi: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 12, marginHorizontal: 6, borderRadius: 12 },
  pcS: { height: 28, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  maxB: { height: 28, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, justifyContent: "center" },
  pcts: { flexDirection: "row", gap: 8 },
  pc: { flex: 1, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  seg: { flexDirection: "row", padding: 4, borderRadius: 20 },
  segThumb: { position: "absolute", top: 4, bottom: 4, left: 0, borderRadius: 16 },
  segI: { height: 32, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  prev: { borderRadius: 12, paddingHorizontal: 12 },
  pr: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
  prv: { fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums", "no-contextual"] },
  lvh: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  eb: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.6 },
  step: { flexDirection: "row", alignItems: "center", gap: 4 },
  stp: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  lv: { fontFamily: font.semibold, fontSize: 24, minWidth: 84, textAlign: "center", fontVariant: ["tabular-nums", "no-contextual"] },
  trk: { height: 64, marginHorizontal: 14, marginTop: 6 },
  bg: { position: "absolute", left: 0, right: 0, top: TRACK_TOP, height: 4, borderRadius: 2 },
  fl: { position: "absolute", left: 0, top: TRACK_TOP, height: 4, borderRadius: 2, overflow: "hidden" },
  mkHit: { position: "absolute", top: 0, width: 44, height: 60, alignItems: "center", gap: 12 },
  mk: { marginTop: 14, width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2 },
  th: {
    position: "absolute", left: 0, top: 5, width: THUMB, height: THUMB, borderRadius: THUMB / 2, borderWidth: 2, borderColor: "#703AE6",
    alignItems: "center", justifyContent: "center", shadowColor: "#703AE6", shadowOpacity: 0.45, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  note: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 12, alignItems: "flex-start" },
});
