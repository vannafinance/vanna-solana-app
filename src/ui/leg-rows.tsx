import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";

import { openTx } from "@/components/history";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme/use-theme";
import { type Family, font } from "@/theme/tokens";

import { ACTIVE, barLit, type Leg, type LegPhase, type LegsState, shortSig, WORD } from "./legs";

/* The multi-leg sheet's pieces (design/perps-flow/multileg.css): the segmented Sent / Processed / Confirmed bar, the compact leg rows,
   the calm Cancel / Stop text button and the inline Stop confirm. Motion only on a state change (a word swaps in, a check pops, a
   failed row nudges, a segment fills); reduce motion leaves the icons and words alone to tell the state. */

const EASE = Easing.bezier(0.2, 0, 0, 1);
const PURPLE = "#703AE6";

/* ------------------------------------------------------------------ the bar: one segment per leg */
export function LegBar({ s }: { s: LegsState }) {
  const { colors } = useTheme();
  const lit = barLit(s);
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.segbar}>
        {s.legs.map((l) => (
          <Segment key={l.id} phase={l.phase} />
        ))}
      </View>
      <View style={styles.steps}>
        {["Sent", "Processed", "Confirmed"].map((l, i) => (
          <View key={l} style={styles.step}>
            {i > 0 && <View style={[styles.em, { backgroundColor: colors.border }]} />}
            <View style={[styles.dot, { backgroundColor: lit[i] ? PURPLE : colors.border }]} />
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: lit[i] ? colors.text : colors.muted }}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Segment({ phase }: { phase: LegPhase }) {
  const { colors, isDark } = useTheme();
  const rm = useReducedMotion();
  const w = useSharedValue(phase === "done" || phase === "failed" ? 100 : 0);
  const glint = useSharedValue(0);
  const active = ACTIVE.includes(phase);
  useEffect(() => {
    w.value = withTiming(phase === "done" || phase === "failed" ? 100 : 0, { duration: rm ? 0 : 500, easing: EASE });
  }, [phase, rm, w]);
  useEffect(() => {
    if (active && !rm) glint.value = withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 1600, easing: EASE })), -1);
    else {
      cancelAnimation(glint);
      glint.value = 0;
    }
  }, [active, rm, glint]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  const gl = useAnimatedStyle(() => ({ left: `${-60 + glint.value * 160}%`, opacity: active ? (rm ? 0.35 : 1) : 0 }));
  return (
    <View style={[styles.sg, { backgroundColor: isDark ? colors.divider : "#ECECEF" }]}>
      <Animated.View style={[styles.sgFill, { backgroundColor: phase === "failed" ? colors.negative : PURPLE }, fill]} />
      <Animated.View style={[styles.glint, gl]} />
    </View>
  );
}

/* ------------------------------------------------------------------ the rows */
export function LegList({ s, multi, onRetry }: { s: LegsState; multi: boolean; onRetry?: (id: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.bg }]}>
      {s.legs.map((l, i) => (
        <LegRow key={l.id} leg={l} first={i === 0} explorer={multi} onRetry={onRetry} />
      ))}
    </View>
  );
}

function RowSpinner({ slow }: { slow: boolean }) {
  const rm = useReducedMotion();
  const r = useSharedValue(0);
  useEffect(() => {
    if (rm) return;
    r.value = 0;
    r.value = withRepeat(withTiming(360, { duration: slow ? 1400 : 900, easing: Easing.linear }), -1);
    return () => cancelAnimation(r);
  }, [slow, rm, r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={[{ width: 18, height: 18, opacity: slow ? 0.7 : 1 }, st]}>
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Defs>
          <SvgGradient id="lspin" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#FC5457" />
            <Stop offset="1" stopColor={PURPLE} />
          </SvgGradient>
        </Defs>
        <Circle cx={9} cy={9} r={7} fill="none" stroke={PURPLE} strokeOpacity={0.14} strokeWidth={2.5} />
        <Path d="M9 2a7 7 0 0 1 7 7" fill="none" stroke="url(#lspin)" strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function LegIcon({ phase }: { phase: LegPhase }) {
  const { colors } = useTheme();
  const rm = useReducedMotion();
  const pop = useSharedValue(1);
  const breathe = useSharedValue(1);
  const prev = useRef(phase);
  useEffect(() => {
    if (phase === "done" && prev.current !== "done" && !rm) {
      pop.value = 0.6;
      pop.value = withSpring(1, { damping: 9, stiffness: 260 });
    }
    prev.current = phase;
    if (phase === "approve" && !rm) breathe.value = withRepeat(withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
    else {
      cancelAnimation(breathe);
      breathe.value = 1;
    }
  }, [phase, rm, pop, breathe]);
  const popSt = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const brSt = useAnimatedStyle(() => ({ opacity: breathe.value }));
  if (phase === "check" || phase === "send" || phase === "confirm") return <RowSpinner slow={phase === "check"} />;
  if (phase === "done")
    return (
      <Animated.View style={[styles.ic, { backgroundColor: PURPLE }, popSt]}>
        <Icon name="check" size={14} color="#FFFFFF" />
      </Animated.View>
    );
  if (phase === "failed")
    return (
      <View style={[styles.ic, { backgroundColor: colors.pinkTint }]}>
        <Icon name="close" size={12} color={colors.onPinkTint} />
      </View>
    );
  if (phase === "unsure") return <Icon name="schedule" size={16} color={colors.warning} />;
  return <Animated.View style={[styles.wait, phase === "approve" ? [{ backgroundColor: PURPLE }, brSt] : { backgroundColor: colors.borderControl, opacity: 0.6 }]} />;
}

function LegRow({ leg, first, explorer, onRetry }: { leg: Leg; first: boolean; explorer: boolean; onRetry?: (id: string) => void }) {
  const { colors } = useTheme();
  const rm = useReducedMotion();
  const { phase } = leg;
  const active = ACTIVE.includes(phase);
  const tint = useSharedValue(active ? 1 : 0);
  const word = useSharedValue(1);
  const shake = useSharedValue(0);
  const prev = useRef(phase);
  useEffect(() => {
    tint.value = withTiming(active ? 1 : 0, { duration: rm ? 0 : 300 });
    if (prev.current !== phase && !rm) {
      word.value = 0;
      word.value = withTiming(1, { duration: 260, easing: EASE });
      if (phase === "failed") shake.value = withSequence(withTiming(-6, { duration: 76 }), withTiming(6, { duration: 76 }), withTiming(-4, { duration: 76 }), withTiming(3, { duration: 76 }), withTiming(0, { duration: 76 }));
    }
    prev.current = phase;
  }, [phase, active, rm, tint, word, shake]);
  const tintSt = useAnimatedStyle(() => ({ opacity: tint.value * 0.7 }));
  const wordSt = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 7 }] }));
  const rowSt = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const quiet = phase === "wait" || phase === "queued" || phase === "skipped";
  const wordColor = phase === "done" ? colors.positive : phase === "failed" ? colors.onPinkTint : phase === "unsure" ? colors.warning : active || phase === "approve" ? colors.text : colors.muted;
  const strong = phase === "done" || phase === "failed" || phase === "unsure" || active || phase === "approve";
  const canRetry = phase === "failed" && !!onRetry;
  const showX = explorer && phase === "done" && !!leg.signature;
  return (
    <Animated.View
      entering={rm ? undefined : FadeIn.duration(280)}
      style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }, rowSt]}
      accessible
      accessibilityLabel={`${leg.label}, ${WORD[phase]}${leg.reason ? `. ${leg.reason}` : ""}`}
    >
      <Animated.View pointerEvents="none" style={[styles.tint, { backgroundColor: colors.purpleTint }, tintSt]} />
      <View style={styles.icBox}>
        <LegIcon phase={phase} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.label, { color: quiet ? colors.muted : colors.text, fontFamily: quiet ? font.regular : font.semibold }]}>{leg.label}</Text>
        {!!leg.reason && <Text style={[styles.reason, { color: phase === "unsure" ? colors.warning : colors.onPinkTint }]}>{leg.reason}</Text>}
        {showX && <Text style={[styles.sig, { color: colors.muted }]}>{shortSig(leg.signature)}</Text>}
      </View>
      {canRetry ? (
        <Pressable onPress={() => onRetry!(leg.id)} accessibilityRole="button" accessibilityLabel={`Retry ${leg.label}`} hitSlop={8} style={[styles.retry, { backgroundColor: colors.pinkTint }]}>
          <Text style={[styles.retryT, { color: colors.onPinkTint }]}>Retry</Text>
        </Pressable>
      ) : (
        <Animated.Text style={[styles.word, { color: wordColor, fontFamily: strong ? font.semibold : font.regular }, wordSt]}>{WORD[phase]}</Animated.Text>
      )}
      {showX && (
        <Pressable onPress={() => openTx(leg.signature)} accessibilityRole="button" accessibilityLabel={`View ${leg.label} on Solana Explorer`} hitSlop={10} style={styles.x}>
          <Icon name="open_in_new" size={16} color={colors.muted} />
        </Pressable>
      )}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ Cancel / Stop: calm, secondary, no height when absent */
export function QuietButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => [styles.quiet, pressed && { backgroundColor: colors.segment }]}>
      <Text style={[styles.quietT, { color: colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

export function StopConfirm({ body, fam, onStop, onKeep }: { body: string; fam: Family; onStop: () => void; onKeep: () => void }) {
  const { colors } = useTheme();
  const rm = useReducedMotion();
  return (
    <Animated.View entering={rm ? undefined : FadeIn.duration(260)} style={[styles.stop, { backgroundColor: colors.bg }]}>
      <Text style={[styles.stopT, { color: colors.text }]}>Stop here?</Text>
      <Text style={[styles.stopD, { color: colors.muted }]}>{body}</Text>
      <View style={styles.stopB}>
        <Button label="Stop" v="outline" size="md" onPress={onStop} style={{ flex: 1 }} />
        <Button label="Keep going" fam={fam} size="md" onPress={onKeep} style={{ flex: 1 }} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  segbar: { flexDirection: "row", gap: 3, height: 4 },
  sg: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  sgFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 2 },
  glint: { position: "absolute", top: 0, bottom: 0, width: "60%", backgroundColor: "rgba(112,58,230,0.45)", borderRadius: 2 },
  steps: { flexDirection: "row", justifyContent: "center", gap: 8 },
  step: { flexDirection: "row", alignItems: "center", gap: 6 },
  em: { width: 20, height: 1, marginRight: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  card: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, marginHorizontal: -8, paddingHorizontal: 8, minHeight: 40 },
  tint: { ...StyleSheet.absoluteFill, borderRadius: 10 },
  icBox: { width: 20, height: 20, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  ic: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  wait: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 14, lineHeight: 20 },
  reason: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  sig: { fontFamily: font.regular, fontSize: 11, lineHeight: 14, fontVariant: ["tabular-nums"] },
  word: { fontSize: 12, lineHeight: 20, alignSelf: "flex-start" },
  // First line of the row, like the status icon and the state word (lineHeight 20), not centred on the label + signature block.
  x: { width: 24, height: 20, alignSelf: "flex-start", marginRight: -4, alignItems: "center", justifyContent: "center" },
  retry: { height: 28, paddingHorizontal: 12, borderRadius: 14, justifyContent: "center", marginVertical: -4 },
  retryT: { fontFamily: font.semibold, fontSize: 12 },
  quiet: { alignSelf: "center", height: 36, paddingHorizontal: 16, borderRadius: 18, justifyContent: "center" },
  quietT: { fontFamily: font.semibold, fontSize: 14 },
  stop: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  stopT: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20 },
  stopD: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  stopB: { flexDirection: "row", gap: 8 },
});
