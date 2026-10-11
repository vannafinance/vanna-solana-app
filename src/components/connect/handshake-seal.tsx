import { useEffect } from "react";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { brand } from "@/theme/tokens";

import { emphasized } from "./motion";

const SIZE = 56;
const TICK_LENGTH = 34;
const SCALLOP =
  "M52.80 28.00 L52.57 29.29 L51.93 30.51 L50.99 31.64 L49.95 32.67 L48.99 33.62 L48.25 34.58 L47.81 35.61 L47.68 36.76 L47.77 38.07 L47.92 39.50 L47.97 40.97 L47.79 42.38 L47.26 43.59 L46.36 44.54 L45.16 45.16 L43.76 45.51 L42.30 45.66 L40.90 45.75 L39.65 45.94 L38.60 46.36 L37.71 47.06 L36.92 48.05 L36.14 49.21 L35.28 50.40 L34.28 51.45 L33.14 52.17 L31.88 52.47 L30.56 52.32 L29.25 51.78 L28.00 51.00 L26.84 50.15 L25.75 49.43 L24.68 48.96 L23.57 48.82 L22.38 48.99 L21.06 49.35 L19.66 49.74 L18.21 49.98 L16.83 49.92 L15.60 49.48 L14.60 48.63 L13.86 47.46 L13.35 46.09 L12.98 44.68 L12.64 43.36 L12.18 42.24 L11.51 41.36 L10.57 40.66 L9.40 40.08 L8.08 39.50 L6.78 38.81 L5.66 37.95 L4.87 36.88 L4.50 35.64 L4.55 34.28 L4.96 32.90 L5.56 31.55 L6.18 30.29 L6.63 29.12 L6.80 28.00 L6.63 26.88 L6.18 25.71 L5.56 24.45 L4.96 23.10 L4.55 21.72 L4.50 20.36 L4.87 19.12 L5.66 18.05 L6.78 17.19 L8.08 16.50 L9.40 15.92 L10.57 15.34 L11.51 14.64 L12.18 13.76 L12.64 12.64 L12.98 11.32 L13.35 9.91 L13.86 8.54 L14.60 7.37 L15.60 6.52 L16.83 6.08 L18.21 6.02 L19.66 6.26 L21.06 6.65 L22.38 7.01 L23.57 7.18 L24.68 7.04 L25.75 6.57 L26.84 5.85 L28.00 5.00 L29.25 4.22 L30.56 3.68 L31.88 3.53 L33.14 3.83 L34.28 4.55 L35.28 5.60 L36.14 6.79 L36.92 7.95 L37.71 8.94 L38.60 9.64 L39.65 10.06 L40.90 10.25 L42.30 10.34 L43.76 10.49 L45.16 10.84 L46.36 11.46 L47.26 12.41 L47.79 13.62 L47.97 15.03 L47.92 16.50 L47.77 17.93 L47.68 19.24 L47.81 20.39 L48.25 21.42 L48.99 22.38 L49.95 23.33 L50.99 24.36 L51.93 25.49 L52.57 26.71 L52.80 28.00 Z";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const overshoot = Easing.bezier(0.34, 1.4, 0.64, 1);

function Gradient({ id }: { id: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={brand.short} />
        <Stop offset="1" stopColor={brand.primary} />
      </LinearGradient>
    </Defs>
  );
}

export function HandshakeSeal() {
  const pop = useSharedValue(0);
  const pulse = useSharedValue(0);
  const tick = useSharedValue(TICK_LENGTH);

  useEffect(() => {
    pop.value = withTiming(1, { duration: 480, easing: overshoot });
    pulse.value = withDelay(140, withTiming(1, { duration: 700, easing: emphasized }));
    tick.value = withDelay(220, withTiming(0, { duration: 280, easing: emphasized }));
    return () => {
      cancelAnimation(pop);
      cancelAnimation(pulse);
      cancelAnimation(tick);
    };
  }, [pop, pulse, tick]);

  const shapeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 3),
    transform: [{ scale: interpolate(pop.value, [0, 1], [0.35, 1]) }, { rotate: `${interpolate(pop.value, [0, 1], [-50, 0])}deg` }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.6, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.85, 1.35]) }],
  }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: tick.value }));
  const layer = { position: "absolute", left: 0, top: 0, width: SIZE, height: SIZE } as const;

  return (
    <Animated.View accessibilityLabel="Connected" style={{ width: SIZE, height: SIZE }}>
      <Animated.View style={[layer, pulseStyle]}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 56 56">
          <Gradient id="sealPulse" />
          <Circle cx={28} cy={28} r={25} fill="none" stroke="url(#sealPulse)" strokeWidth={2} />
        </Svg>
      </Animated.View>
      <Animated.View style={[layer, shapeStyle]}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 56 56">
          <Gradient id="sealShape" />
          <Path d={SCALLOP} fill="url(#sealShape)" />
        </Svg>
      </Animated.View>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 56 56" style={{ position: "absolute" }}>
        <AnimatedPath
          d="M17.5 28.5 L25 35.5 L39.5 20"
          fill="none"
          stroke={brand.onHero}
          strokeWidth={4.6}
          strokeLinecap="square"
          strokeLinejoin="miter"
          strokeDasharray={TICK_LENGTH}
          animatedProps={tickProps}
        />
      </Svg>
    </Animated.View>
  );
}
