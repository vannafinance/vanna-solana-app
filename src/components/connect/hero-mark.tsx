import { useEffect } from "react";
import Animated, {
  Easing,
  type SharedValue,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { VannaMark } from "@/components/ui/vanna-mark";
import { VannaWordmark } from "@/components/ui/vanna-wordmark";
import { brand, palette, spaces } from "@/theme/tokens";

import { keyframes } from "./motion";

export const MARK_SIZE = 104;
const RING_SIZE = MARK_SIZE + 8;
const RING_RADIUS = 52;
const DASH = 330;
const INTRO_MS = 3200;
const WORDMARK_HEIGHT = 42;
const draw = Easing.bezier(0.6, 0, 0.2, 1);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function GradientRing({ id, offset }: { id: string; offset?: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ strokeDashoffset: offset?.value ?? 0 }));

  return (
    <Svg width={RING_SIZE} height={RING_SIZE} viewBox="0 0 112 112" style={{ position: "absolute", left: -4, top: -4, transform: [{ rotate: "-90deg" }] }}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={brand.short} />
          <Stop offset="1" stopColor={brand.primary} />
        </LinearGradient>
      </Defs>
      <AnimatedCircle
        cx={56}
        cy={56}
        r={RING_RADIUS}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={DASH}
        animatedProps={props}
      />
    </Svg>
  );
}

function Shockwave({ color, borderWidth, peak, delay, duration }: { color: string; borderWidth: number; peak: number; delay: number; duration: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.ease) }));
    return () => cancelAnimation(progress);
  }, [delay, duration, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : interpolate(progress.value, [0, 1], [peak, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 2.6]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", width: MARK_SIZE, height: MARK_SIZE, borderRadius: MARK_SIZE / 2, borderWidth, borderColor: color }, style]}
    />
  );
}

function Glow() {
  const cycle = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    cycle.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(cycle);
  }, [cycle, reduceMotion]);

  const violet = useAnimatedStyle(() => ({ opacity: 1 - cycle.value }));
  const coral = useAnimatedStyle(() => ({ opacity: cycle.value }));
  const disc = { position: "absolute", width: MARK_SIZE, height: MARK_SIZE, borderRadius: MARK_SIZE / 2, backgroundColor: palette.dark.background } as const;

  return (
    <>
      <Animated.View style={[disc, { boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 36, color: brand.primary }] }, violet]} />
      <Animated.View style={[disc, { boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 60, color: brand.short }] }, coral]} />
    </>
  );
}

export function HeroMark({ intro }: { intro: boolean }) {
  const reduceMotion = useReducedMotion();
  const playing = intro && !reduceMotion;
  const burstDraw = useSharedValue(playing ? DASH : 0);
  const burst = useSharedValue(0);
  const mainDraw = useSharedValue(playing ? DASH : 0);
  const disc = useSharedValue(playing ? 0 : 1);
  const shift = useSharedValue(0);
  const entrance = useSharedValue(playing ? 0 : 2);
  const letters = useSharedValue(playing ? 0 : 1);

  useEffect(() => {
    if (!playing) return;
    burstDraw.value = withDelay(150, withTiming(0, { duration: 700, easing: draw }));
    burst.value = withDelay(900, withTiming(1, { duration: 520, easing: Easing.out(Easing.ease) }));
    mainDraw.value = withDelay(2550, withTiming(0, { duration: 600, easing: draw }));
    disc.value = withDelay(2550, withTiming(1, { duration: 300 }));
    entrance.value = keyframes([[0, 0], [14, 1], [20, 2]], INTRO_MS);
    shift.value = keyframes([[0, 0], [28, 0], [40, -82], [68, -82], [82, 0], [100, 0]], INTRO_MS, Easing.bezier(0.65, 0, 0.25, 1));
    letters.value = keyframes([[0, 0], [31, 0], [39, 1], [66, 1], [74, 2], [100, 2]], INTRO_MS);
    return () => {
      for (const value of [burstDraw, burst, mainDraw, disc, shift, entrance, letters]) cancelAnimation(value);
    };
  }, [playing, burstDraw, burst, mainDraw, disc, shift, entrance, letters]);

  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 1], [1, 0]),
    transform: [{ scale: interpolate(burst.value, [0, 1], [1, 1.9]) }],
  }));
  const discStyle = useAnimatedStyle(() => ({ opacity: disc.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entrance.value, [0, 1, 2], [0, 1, 1]),
    transform: [
      { translateX: shift.value },
      { scale: interpolate(entrance.value, [0, 1, 2], [0.4, 1.08, 1]) },
      { rotate: `${interpolate(entrance.value, [0, 1, 2], [-24, 3, 0])}deg` },
    ],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(letters.value, [0, 1, 2], [0.4, 1, 0.4]),
    transform: [{ translateY: interpolate(letters.value, [0, 1, 2], [58, 0, -60]) }],
  }));

  return (
    <Animated.View style={{ width: MARK_SIZE, height: MARK_SIZE }}>
      {playing ? (
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, burstStyle]}>
          <GradientRing id="heroRingBurst" offset={burstDraw} />
        </Animated.View>
      ) : null}
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: MARK_SIZE, height: MARK_SIZE }, discStyle]}>
        <Glow />
      </Animated.View>
      <GradientRing id="heroRing" offset={mainDraw} />
      {playing ? (
        <>
          <Shockwave color={palette.dark.link} borderWidth={2} peak={0.7} delay={2700} duration={1100} />
          <Shockwave color={spaces.farm.panel[0]} borderWidth={1} peak={0.55} delay={2850} duration={1400} />
        </>
      ) : null}
      <Animated.View accessibilityLabel="Vanna" style={[{ position: "absolute", width: MARK_SIZE, height: MARK_SIZE, alignItems: "center", justifyContent: "center" }, markStyle]}>
        <VannaMark size={60} tone="logo" />
      </Animated.View>
      {playing ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", left: 14, top: 31, height: WORDMARK_HEIGHT, width: WORDMARK_HEIGHT * (206 / 48), overflow: "hidden" }}
        >
          <Animated.View style={wordmarkStyle}>
            <VannaWordmark color={brand.onHero} height={WORDMARK_HEIGHT} />
          </Animated.View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
