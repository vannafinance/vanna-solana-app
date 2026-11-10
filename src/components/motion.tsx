import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { type LayoutChangeEvent, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { useTheme } from "@/theme/use-theme";
import { type Family, font } from "@/theme/tokens";

/* Motion from the design (base.css): the pill highlight slides 300 ms cubic-bezier(.2,0,0,1); a page switch slides the content in
   36 px from the side it comes from (340 ms); a tab / chip switch cross-fades the content (150 ms). */
const STD = Easing.bezier(0.2, 0, 0, 1);

// Content that animates in whenever `k` changes: slide for page switches (dir), cross-fade otherwise.
// Plain shared values rather than layout animations, so it behaves the same on Android, iOS and web.
export function Swap({ k, dir, children, style }: { k: string; dir?: 1 | -1; children: ReactNode; style?: ViewStyle }) {
  return (
    <SwapIn key={k} dir={dir} style={style}>
      {children}
    </SwapIn>
  );
}

function SwapIn({ dir, children, style }: { dir?: 1 | -1; children: ReactNode; style?: ViewStyle }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: dir ? 340 : 150, easing: STD });
  }, [p, dir]);
  const st = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateX: dir ? (1 - p.value) * 36 * dir : 0 }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

function useSlide(index: number, width: number) {
  const x = useSharedValue(index * width);
  const ready = useRef(false);
  useEffect(() => {
    if (!width) return;
    if (!ready.current) {
      x.set(index * width);
      ready.current = true;
    } else x.set(withTiming(index * width, { duration: 300, easing: STD }));
  }, [index, width, x]);
  return x;
}

// The page pill (PageIsland): floating on the hero's lower edge, gradient highlight that slides. With icons (Rewards), each tab is an
// icon over its label, so long words (Leaderboard) fit in full; the selected icon fills.
export function PagePill<K extends string>({ items, value, onChange, fam, icons }: { items: [K, string][]; value: K; onChange: (k: K) => void; fam: Family; icons?: Record<K, IconName> }) {
  const { colors, isDark } = useTheme();
  const [w, setW] = useState(0);
  const i = Math.max(0, items.findIndex(([k]) => k === value));
  const seg = w ? (w - 12) / items.length : 0;
  const x = useSlide(i, seg);
  const hl = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.ppWrap}>
      <View style={[styles.pp, icons && styles.ppI, { backgroundColor: colors.surface }, isDark ? styles.ppDark : styles.ppShadow]} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {seg > 0 && (
          <Animated.View style={[styles.hl, icons && { borderRadius: 16 }, { width: seg }, hl]}>
            <LinearGradient colors={fam.n} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: icons ? 16 : 22 }]} />
          </Animated.View>
        )}
        {items.map(([k, label]) => {
          const on = k === value;
          return (
            <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} style={[styles.ppT, icons && styles.ppTI]}>
              {icons && <Icon name={icons[k]} size={20} filled={on} color={on ? "#FFFFFF" : colors.muted} />}
              <Text numberOfLines={1} style={[styles.ppText, icons && styles.ppTextI, { color: on ? "#FFFFFF" : colors.muted }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Pill tabs (Notifications, Earn vault, Portfolio). The fill sits on the chip you tap. It does not travel
// across the chips in between. When the row is wider than the screen, the edge arrows scroll it.
export function PillTabs<K extends string>({ items, value, onChange, color }: { items: [K, string][]; value: K; onChange: (k: K) => void; color: string }) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [boxes, setBoxes] = useState<Record<string, { x: number; w: number }>>({});
  const [viewW, setViewW] = useState(0);
  const [contentW, setContentW] = useState(0);
  const scrollX = useRef(0);
  const prevValue = useRef<K>(value);
  const didInitScroll = useRef(false);
  const [edges, setEdges] = useState({ left: false, right: false });
  const b = boxes[value];
  const x = useSharedValue(0), wv = useSharedValue(0), show = useSharedValue(0);

  const measureEdges = (sx: number, cw = contentW, vw = viewW) => {
    if (vw <= 0 || cw <= 0) return;
    const left = sx > 4;
    const right = cw > vw + 4 && sx + vw < cw - 4;
    setEdges((p) => (p.left === left && p.right === right ? p : { left, right }));
  };

  useEffect(() => {
    if (viewW <= 0 || contentW <= 0) return;
    measureEdges(scrollX.current, contentW, viewW);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewW, contentW]);

  // Update animated pill highlight
  useEffect(() => {
    if (!b) return;
    x.set(b.x);
    wv.set(b.w);
    show.set(1);
  }, [b, x, wv, show]);

  // Bring selected tab into view ONLY when `value` changes or on initial layout
  useEffect(() => {
    if (!b || viewW <= 0) return;
    const valueChanged = prevValue.current !== value;
    if (!valueChanged && didInitScroll.current) return;
    prevValue.current = value;
    didInitScroll.current = true;

    const max = Math.max(0, contentW - viewW);
    if (max <= 0) return;

    const sx = scrollX.current;
    if (b.x < sx + 44) {
      const next = Math.max(0, b.x - 16);
      scrollX.current = next;
      scrollRef.current?.scrollTo({ x: next, y: 0, animated: valueChanged });
      measureEdges(next, contentW, viewW);
    } else if (b.x + b.w > sx + viewW - 44) {
      const next = Math.min(max, b.x + b.w - viewW + 16);
      scrollX.current = next;
      scrollRef.current?.scrollTo({ x: next, y: 0, animated: valueChanged });
      measureEdges(next, contentW, viewW);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b, value, viewW, contentW]);

  const hl = useAnimatedStyle(() => ({ opacity: show.value, transform: [{ translateX: x.value }], width: wv.value }));

  const nudge = (dir: -1 | 1) => {
    const max = Math.max(0, contentW - viewW);
    if (max <= 0) return;
    const base = scrollX.current;
    let next = Math.max(0, Math.min(max, base + dir * 160));
    if (next < 8) next = 0;
    else if (max - next < 8) next = max;
    scrollX.current = next;
    scrollRef.current?.scrollTo({ x: next, y: 0, animated: true });
    measureEdges(next, contentW, viewW);
  };

  return (
    <View style={styles.ptw} onLayout={(e) => setViewW(e.nativeEvent.layout.width)}>
      <View style={styles.clip}>
        <ScrollView
          ref={scrollRef}
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.sc}
          contentContainerStyle={styles.chips}
          accessibilityRole="tablist"
          scrollEventThrottle={16}
          onContentSizeChange={(w) => {
            setContentW(w);
            measureEdges(scrollX.current, w, viewW);
          }}
          onScroll={(e) => {
            const sx = e.nativeEvent.contentOffset.x;
            scrollX.current = sx;
            measureEdges(sx, contentW, viewW);
          }}
        >
          <Animated.View style={[styles.chipHl, { backgroundColor: color }, hl]} />
          {items.map(([k, label]) => {
            const on = k === value;
            return (
              <Pressable
                key={k}
                onLayout={(e) => {
                  const { x: lx, width } = e.nativeEvent.layout;
                  setBoxes((p) => (p[k]?.x === lx && p[k]?.w === width ? p : { ...p, [k]: { x: lx, w: width } }));
                }}
                onPress={() => onChange(k)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.chip, { borderColor: on ? "transparent" : colors.border }]}
              >
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: on ? "#FFFFFF" : colors.text }}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {edges.left && <View pointerEvents="none" style={[styles.mask, styles.maskL, { backgroundColor: colors.bg }]} />}
      {edges.right && <View pointerEvents="none" style={[styles.mask, styles.maskR, { backgroundColor: colors.bg }]} />}
      {edges.left && (
        <Pressable
          onPress={() => nudge(-1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Scroll tabs left"
          style={[styles.pta, styles.ptaL, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <Icon name="chevron_right" size={18} color={colors.text} />
          </View>
        </Pressable>
      )}
      {edges.right && (
        <Pressable
          onPress={() => nudge(1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Scroll tabs right"
          style={[styles.pta, styles.ptaR, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Icon name="chevron_right" size={18} color={colors.text} />
        </Pressable>
      )}
    </View>
  );
}

// Underlined segmented tabs (Current | History) with counts; the gradient underline slides.
export function SubTabs<K extends string>({ items, value, onChange, fam }: { items: [K, string, number?][]; value: K; onChange: (k: K) => void; fam: Family }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const i = Math.max(0, items.findIndex(([k]) => k === value));
  const seg = w / items.length;
  const x = useSlide(i, seg);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={[styles.subt, { borderBottomColor: colors.border }]} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {items.map(([k, label, count]) => {
        const on = k === value;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={styles.subtItem}>
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: on ? colors.text : colors.muted }}>
              {label}
              {count != null && <Text style={{ fontFamily: font.regular, color: colors.muted }}>{`  ${count}`}</Text>}
            </Text>
          </Pressable>
        );
      })}
      {seg > 0 && (
        <Animated.View style={[styles.underline, { width: seg * 0.68, left: seg * 0.16 }, st]}>
          <LinearGradient colors={fam.n} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ppWrap: { marginTop: -28, paddingHorizontal: 16, zIndex: 2 },
  pp: { height: 56, padding: 6, borderRadius: 28, flexDirection: "row", maxWidth: 520, width: "100%", alignSelf: "center" },
  ppShadow: { shadowColor: "#110B2E", shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: 18 }, elevation: 8 },
  ppDark: { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 18 }, elevation: 8 },
  hl: { position: "absolute", left: 6, top: 6, bottom: 6, borderRadius: 22, shadowColor: "#110B2E", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  ppT: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 22, paddingHorizontal: 4 },
  ppText: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  ppI: { height: 64, borderRadius: 22 },
  ppTI: { gap: 2, borderRadius: 16, paddingHorizontal: 2 },
  ppTextI: { fontSize: 11, lineHeight: 14 },
  ptw: { position: "relative", marginHorizontal: -16 },
  sc: { width: "100%", zIndex: 0 },
  // Ends at the arrow's inner edge, so a chip can show there and nowhere under or past the arrow.
  clip: { overflow: "hidden" },
  clipL: { marginLeft: 44 },
  clipR: { marginRight: 44 },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  mask: { position: "absolute", top: 0, bottom: 0, width: 44, zIndex: 1 },
  maskL: { left: 0 },
  maskR: { right: 0 },
  pta: { position: "absolute", top: 2, zIndex: 2, width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  ptaL: { left: 12 },
  ptaR: { right: 12 },
  chipHl: { position: "absolute", left: 0, top: 0, height: 36, borderRadius: 18 },
  chip: { height: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  subt: { flexDirection: "row", height: 48, borderBottomWidth: 1 },
  subtItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  underline: { position: "absolute", bottom: -1, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, overflow: "hidden" },
});
