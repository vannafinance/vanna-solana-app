import { useEffect, useSyncExternalStore } from "react";
import { Image, Platform, StyleSheet } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { captureScreen } from "react-native-view-shot";

/* Theme cross-fade: snapshot the screen, switch the theme underneath (every screen, bar and sheet at once), then fade the snapshot
   out. Web (no screen capture) just switches. */
let shot: string | null = null;
const subs = new Set<() => void>();
const set = (v: string | null) => {
  shot = v;
  subs.forEach((s) => s());
};

export async function crossFadeTheme(apply: () => void) {
  if (Platform.OS === "web") return apply();
  try {
    const uri = await captureScreen({ format: "jpg", quality: 0.9, result: "tmpfile" });
    set(uri);
    // let the snapshot paint before the theme changes beneath it
    requestAnimationFrame(() => requestAnimationFrame(apply));
  } catch {
    apply();
  }
}

export function ThemeFadeHost() {
  const uri = useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => shot,
  );
  return uri ? <Fade key={uri} uri={uri} /> : null;
}

function Fade({ uri }: { uri: string }) {
  const o = useSharedValue(1);
  useEffect(() => {
    // after the new theme has rendered under it
    const t = setTimeout(() => {
      o.value = withTiming(0, { duration: 380, easing: Easing.bezier(0.2, 0, 0, 1) }, (done) => done && runOnJS(set)(null));
    }, 60);
    return () => clearTimeout(t);
  }, [o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={0} />
    </Animated.View>
  );
}
