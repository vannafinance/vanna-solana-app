import { type ReactNode, type RefObject, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BackHandler, type HostInstance, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, KeyboardState, runOnJS, useAnimatedKeyboard, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";

/* One overlay layer above every screen (tab bar included): bottom sheets, anchored dropdown menus, tooltips and toasts. Rendered inside
   the app's own tree, so the safe-area insets are the real ones on every device (gesture bar, 3-button nav, notches). */

type SheetSpec = {
  title?: string;
  content: (close: () => void) => ReactNode;
  footer?: (close: () => void) => ReactNode;
  onClose?: () => void;
  // detents (design V7 W1): opens at medium height; drag or scroll up grows it to large before the content scrolls
  detents?: boolean;
  // flows (Deposit, Withdraw, Transfer) open at the large detent and can be dragged down to medium or closed
  startLarge?: boolean;
};
type Box = { x: number; y: number; w: number; h: number };
type MenuSpec = {
  anchor: Box;
  anchorRef?: RefObject<HostInstance | null>;
  width?: number;
  alignLeft?: boolean;
  render: (close: () => void) => ReactNode;
  kind: "menu" | "tip";
};
export type ToastTone = "ok" | "info" | "err";
type State = { sheet: SheetSpec | null; sheetKey: number; menu: MenuSpec | null; menuKey: number; toast: { text: string; tone: ToastTone; key: number } | null };

let state: State = { sheet: null, sheetKey: 0, menu: null, menuKey: 0, toast: null };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  subs.forEach((s) => s());
};
const useOverlay = () =>
  useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => state,
  );

export function openSheet(spec: SheetSpec) {
  set({ sheet: spec, sheetKey: state.sheetKey + 1, menu: null });
}
let closing: (() => void) | null = null;
// Animated close (the host plays the exit, then clears the sheet).
export function closeSheet() {
  if (closing) closing();
  else set({ sheet: null });
}

// Dropdown menu anchored to a view (design core anchor menus): below it, or above when there is no room.
export function openMenu(anchor: RefObject<HostInstance | null>, render: (close: () => void) => ReactNode, opts: { width?: number; alignLeft?: boolean } = {}) {
  anchor.current?.measureInWindow((x, y, w, h) =>
    set({
      menu: {
        anchor: { x, y, w, h },
        anchorRef: anchor,
        width: opts.width,
        alignLeft: opts.alignLeft,
        render,
        kind: "menu",
      },
      menuKey: state.menuKey + 1,
    })
  );
}
// Tooltip (design .iact-tip / amap tips): one line above the icon; any tap closes it.
export function openTip(anchor: RefObject<HostInstance | null>, text: string) {
  anchor.current?.measureInWindow((x, y, w, h) =>
    set({
      menu: {
        anchor: { x, y, w, h },
        anchorRef: anchor,
        render: () => <TipText text={text} />,
        kind: "tip",
      },
      menuKey: state.menuKey + 1,
    })
  );
}
export const closeMenu = () => set({ menu: null });

let toastTimer: ReturnType<typeof setTimeout> | undefined;
// Toast (option C): a short pill above the tab bar, inverse of the theme so it stands out, with an icon for the kind of message.
export function toast(text: string, tone: ToastTone = "ok") {
  clearTimeout(toastTimer);
  set({ toast: { text, tone, key: Date.now() } });
  toastTimer = setTimeout(() => set({ toast: null }), 2200);
}

const OUT = Easing.bezier(0.4, 0, 1, 1);
const SPRING = { damping: 30, stiffness: 300, mass: 0.9, overshootClamping: true };

export function OverlayHost() {
  const { sheet, sheetKey, menu, menuKey, toast: t } = useOverlay();
  const insets = useSafeAreaInsets();
  return (
    <>
      {sheet && <SheetView key={sheetKey} spec={sheet} />}
      {menu && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: sheet ? 0 : insets.bottom + 64,
            overflow: "hidden",
          }}
          pointerEvents="box-none"
        >
          <MenuView key={menuKey} spec={menu} />
        </View>
      )}
      {t && <Toast key={t.key} text={t.text} tone={t.tone} />}
    </>
  );
}

function SheetView({ spec }: { spec: SheetSpec }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const large = height - insets.top - 16;
  const mediumY = spec.detents ? Math.max(0, large - Math.round(height * 0.58)) : 0; // offset from the large position
  const y = useSharedValue(height);
  const scrim = useSharedValue(0);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(!spec.detents || !!spec.startLarge);
  const opened = useRef(false);

  const finish = () => {
    set({ sheet: null });
    spec.onClose?.();
  };
  const close = () => {
    if (done) return;
    setDone(true);
    scrim.value = withTiming(0, { duration: 220, easing: OUT });
    y.value = withTiming(height, { duration: 220, easing: OUT });
    // finish on a timer, not the animation callback: a throttled frame loop (background tab, busy JS) must not leave the sheet behind
    setTimeout(finish, 240);
  };

  // open once the sheet has its size, so the spring travels exactly its own height (no jump, no long slide)
  const onLayout = (h: number) => {
    if (opened.current) return;
    opened.current = true;
    y.value = h;
    scrim.value = withTiming(1, { duration: 220 });
    y.value = withSpring(spec.startLarge ? 0 : mediumY, SPRING);
  };

  useEffect(() => {
    closing = close;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => (close(), true));
    return () => {
      sub.remove();
      if (closing === close) closing = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snap = (to: number) => {
    "worklet";
    y.set(withSpring(to, SPRING));
    runOnJS(setExpanded)(to === 0);
  };
  const makeDrag = () =>
    Gesture.Pan()
    .onChange((e) => {
      y.value = Math.max(0, y.value + e.changeY);
    })
    .onEnd((e) => {
      const rest = spec.detents ? mediumY : 0;
      if (y.value > rest + 110 || e.velocityY > 1100) runOnJS(close)();
      else if (!spec.detents) snap(0);
      else if (e.velocityY < -600 || y.value < mediumY / 2) snap(0);
      else snap(mediumY);
    });
  const headDrag = makeDrag();
  // while not expanded, a drag anywhere on the body moves the sheet (the first upward scroll grows it)
  const bodyDrag = makeDrag().enabled(!expanded);

  /* Keyboard lift. On Android (edge-to-edge, Expo Go) useAnimatedKeyboard can keep the last keyboard height after the keyboard has
     closed, which left every later sheet floating that far above the bottom. So the height only counts while Reanimated says the
     keyboard is opening or open AND React Native's own keyboard events agree it is showing. */
  const kb = useAnimatedKeyboard();
  const kbOn = useSharedValue(Keyboard.isVisible() ? 1 : 0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => (kbOn.value = 1));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => (kbOn.value = 0));
    return () => (show.remove(), hide.remove());
  }, [kbOn]);
  const sheetStyle = useAnimatedStyle(() => {
    const st = kb.state.value;
    const live = st === KeyboardState.OPEN || st === KeyboardState.OPENING || (Platform.OS === "ios" && st === KeyboardState.CLOSING);
    const k = live && kbOn.value === 1 ? Math.max(0, kb.height.value) : 0;
    const room = large - k;
    return spec.detents
      ? { height: room, transform: [{ translateY: y.value - k }] }
      : { maxHeight: room, transform: [{ translateY: y.value - k }] };
  });
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));

  const head = (
    <View>
      <View style={[styles.handle, { backgroundColor: colors.borderControl }, Platform.OS === "ios" && styles.grabber]} />
      {spec.title != null && (
        <View style={styles.head}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            {spec.title}
          </Text>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" style={[styles.close, { backgroundColor: colors.segment }]}>
            <Icon name="close" size={22} />
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        onLayout={(e) => onLayout(e.nativeEvent.layout.height)}
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: insets.bottom + 12 },
          sheetStyle,
        ]}
        accessibilityViewIsModal
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
      >
        <GestureDetector gesture={headDrag}>
          {head}
        </GestureDetector>
        <GestureDetector gesture={bodyDrag}>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={styles.body}
            bounces={false}
            scrollEnabled={expanded}
            keyboardShouldPersistTaps="handled"
          >
            {spec.content(close)}
          </ScrollView>
        </GestureDetector>
        {spec.footer && <View style={styles.footer}>{spec.footer(close)}</View>}
      </Animated.View>
    </View>
  );
}

function MenuView({ spec }: { spec: MenuSpec }) {
  const { colors, isDark } = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const p = useSharedValue(0);
  const [h, setH] = useState(0);
  const [a, setA] = useState(spec.anchor);
  const menuDomRef = useRef<View>(null);

  useEffect(() => {
    p.value = withTiming(1, { duration: 160, easing: Easing.bezier(0.2, 0, 0, 1) });
  }, [p]);
  const close = () => {
    p.set(withTiming(0, { duration: 120 }));
    setTimeout(closeMenu, 130);
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => (close(), true));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track anchor element position at 60fps as the user scrolls the page
  useEffect(() => {
    if (!spec.anchorRef) return;
    let animId: number;
    let active = true;
    const track = () => {
      if (!active) return;
      spec.anchorRef?.current?.measureInWindow((x, y, w, h) => {
        if (!active) return;
        if (w > 0 && h > 0) {
          if (y + h < insets.top + 40 || y > H - insets.bottom - 60) {
            close();
            return;
          }
          setA((prev) =>
            Math.abs(prev.x - x) > 0.5 ||
            Math.abs(prev.y - y) > 0.5 ||
            prev.w !== w ||
            prev.h !== h
              ? { x, y, w, h }
              : prev
          );
        }
      });
      animId = requestAnimationFrame(track);
    };
    animId = requestAnimationFrame(track);
    return () => {
      active = false;
      cancelAnimationFrame(animId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.anchorRef, insets.top, insets.bottom, H]);

  // On Web: allow scrolling freely while dropdown is open; close when clicking outside the menu
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const node = menuDomRef.current as any;
      const domNode =
        node instanceof HTMLElement
          ? node
          : node?.node ?? node?._nativeTag;
      if (domNode && domNode.contains && domNode.contains(e.target as Node)) {
        return;
      }
      close();
    };
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tip = spec.kind === "tip";
  const width = tip ? Math.min(W - 32, 280) : Math.min(W - 24, spec.width ?? Math.max(a.w, 260));
  const chipOnLeft = spec.alignLeft ?? a.x + a.w / 2 < W / 2;
  const left = tip
    ? Math.max(16, Math.min(W - 16 - width, a.x - 12))
    : chipOnLeft
      ? Math.max(12, Math.min(W - 12 - width, a.x))
      : Math.max(12, Math.min(W - 12 - width, a.x + a.w - width));
  const below = a.y + a.h + 6;
  const up = tip;
  const top = up ? a.y - 6 - h : below;
  const st = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * (up ? 6 : -6) }, { scale: 0.97 + 0.03 * p.value }] }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {Platform.OS !== "web" && (
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      )}
      <Animated.View
        ref={menuDomRef as any}
        onLayout={(e) => setH(e.nativeEvent.layout.height)}
        style={[
          tip ? styles.tip : styles.menu,
          { left, top: h ? top : below, width, opacity: h ? undefined : 0, overflow: "hidden" },
          tip ? { backgroundColor: isDark ? "#E9E7EF" : "#2C2C2C" } : { backgroundColor: isDark ? "#2A2A2A" : colors.surface, borderColor: colors.border },
          st,
        ]}
        accessibilityRole={tip ? "text" : "menu"}
      >
        {tip ? (
          spec.render(close)
        ) : (
          <ScrollView style={{ maxHeight: 224 }} bounces={false} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {spec.render(close)}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

function TipText({ text }: { text: string }) {
  const { isDark } = useTheme();
  return <Text style={[styles.tipText, { color: isDark ? "#1B1A20" : "#FFFFFF" }]}>{text}</Text>;
}

const TOAST_ICON: Record<ToastTone, { icon: IconName; bg: string }> = {
  ok: { icon: "check", bg: "#1C7C83" },
  info: { icon: "info", bg: "#703AE6" },
  err: { icon: "error", bg: "#D23F42" },
};
function Toast({ text, tone }: { text: string; tone: ToastTone }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withTiming(1, { duration: 320, easing: Easing.bezier(0.23, 1, 0.32, 1) });
  }, [o]);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, o.value * 1.6), transform: [{ translateY: (1 - o.value) * 24 }, { scale: 0.96 + o.value * 0.04 }] }));
  const ic = TOAST_ICON[tone];
  return (
    <View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 68 }]}>
      <Animated.View
        style={[styles.toast, { backgroundColor: isDark ? "#F2F1F6" : "#1E1D24" }, isDark ? styles.toastShDark : styles.toastShLight, st]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <View style={[styles.toastDot, { backgroundColor: ic.bg }]}>
          <Icon name={ic.icon} size={16} color="#FFFFFF" bold />
        </View>
        <Text style={[styles.toastText, { color: isDark ? "#111111" : "#FFFFFF" }]} numberOfLines={2}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { alignSelf: "center", width: 32, height: 4, borderRadius: 2, marginTop: 8, opacity: 0.5 },
  grabber: { width: 36, height: 5, borderRadius: 3 },
  head: { flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 12, minHeight: 60 },
  title: { flex: 1, fontFamily: font.semibold, fontSize: 20, lineHeight: 28 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  menu: {
    position: "absolute", borderRadius: 16, borderWidth: 1, paddingVertical: 6, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 16 }, elevation: 12,
  },
  tip: { position: "absolute", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tipText: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  toastWrap: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  toast: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, maxWidth: 420, paddingLeft: 9, paddingRight: 18, paddingVertical: 8, borderRadius: 22 },
  toastShDark: { shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  toastShLight: { shadowColor: "#110B2E", shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  toastDot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  toastText: { flexShrink: 1, fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
});
