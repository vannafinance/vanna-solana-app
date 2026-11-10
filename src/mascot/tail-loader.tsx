import { useEffect, useId, useMemo } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

/* Tail-curl loader (design shared/tail-loader.js): the round 1 tail coil alone. It curls in (draws from the outer end to the tip), holds,
   uncurls, while the whole coil turns slowly. 1.8 s loop: draw 0–50%, hold to 62%, retract to 100%, cubic-bezier(.45,0,.25,1). */
const AnimatedPath = Animated.createAnimatedComponent(Path);
const EASE = Easing.bezier(0.45, 0, 0.25, 1);

function coil() {
  const p: [number, number][] = [];
  const cx = 26, cy = 62, r0 = 21, r1 = 7, a0 = 80, sweep = 330, k = 60;
  for (let i = 0; i <= k; i++) {
    const t = i / k, a = ((a0 + sweep * t) * Math.PI) / 180, r = r0 + (r1 - r0) * t;
    p.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]);
  }
  let len = 0;
  for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return { d: "M" + p.map((q) => q[0].toFixed(2) + " " + q[1].toFixed(2)).join(" L"), len };
}
const C = coil();

export function TailLoader({ size = 48, colours = ["#FC5457", "#B6479E", "#703AE6"] }: { size?: number; colours?: string[] }) {
  const u = "vtl" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const off = useSharedValue(C.len);
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 1800, easing: Easing.linear }), -1);
    off.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 900, easing: EASE }),
        withTiming(0, { duration: 216 }),
        withTiming(C.len, { duration: 684, easing: EASE }),
      ),
      -1,
    );
  }, [off, rot]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: off.value }));
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const stops = useMemo(() => colours.map((c, i) => <Stop key={i} offset={(i / (colours.length - 1)).toFixed(2)} stopColor={c} />), [colours]);
  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityLabel="Working">
      <Animated.View style={[{ width: size, height: size }, spin]}>
        {/* the viewBox is centred on the coil (26, 62), so rotating the view turns the coil about its own centre */}
        <Svg width={size} height={size} viewBox="-2 34 56 56">
          <Defs>
            <LinearGradient id={u} gradientUnits="userSpaceOnUse" x1="4" y1="86" x2="48" y2="40">
              {stops}
            </LinearGradient>
          </Defs>
          <Path d={C.d} stroke={colours[colours.length - 1]} strokeOpacity={0.14} strokeWidth={11} strokeLinecap="round" fill="none" />
          <AnimatedPath animatedProps={props} d={C.d} stroke={`url(#${u})`} strokeWidth={11} strokeLinecap="round" fill="none" strokeDasharray={[C.len, C.len]} />
        </Svg>
      </Animated.View>
    </View>
  );
}
