import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { brand, palette, spaces } from "@/theme/tokens";

import { HeroMark, MARK_SIZE } from "./hero-mark";
import { OrbitRing, type Orbiter } from "./orbit-ring";

export const ORBIT_DIAMETER = 316;
export const ORBIT_EXTENT = 360;
const INNER = 208;
const DESIGN_WIDTH = 412;

const outerOrbiters: readonly Orbiter[] = [
  { symbol: "TSLAx", angle: -90 },
  { symbol: "GOOGLx", angle: 0 },
  { symbol: "OPENAI", angle: 150 },
  { symbol: "SOL", angle: 40 },
];

const innerOrbiters: readonly Orbiter[] = [
  { symbol: "USDC", angle: -40 },
  { symbol: "ANTHROPIC", angle: -160 },
  { symbol: "AAPLx", angle: 90 },
];

const stars = [
  [33, 81], [130, 254], [227, 427], [324, 80], [29, 253], [126, 426],
  [223, 79], [320, 252], [25, 425], [122, 78], [219, 251], [316, 424],
  [21, 77], [118, 250], [215, 423], [312, 76], [17, 249], [114, 422],
] as const;

const STAR_PERIOD_MS = 2400;
const STAR_PERIOD_STEP_MS = 700;
const STAR_DELAY_STEP_MS = 370;
const STAR_DELAY_WRAP_MS = 3000;

type Intro = { starsAt: number; fadeMs: number } | undefined;

function Star({ x, y, index, startAt }: { x: number; y: number; index: number; startAt: number }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(reduceMotion ? 0.5 : 0);
  const size = 2 + (index % 3);

  useEffect(() => {
    if (reduceMotion) return;
    const half = (STAR_PERIOD_MS + (index % 5) * STAR_PERIOD_STEP_MS) / 2;
    const offset = (index * STAR_DELAY_STEP_MS) % STAR_DELAY_WRAP_MS;
    pulse.value = withDelay(
      startAt + offset,
      withRepeat(withSequence(withTiming(1, { duration: half }), withTiming(0, { duration: half })), -1),
    );
    return () => cancelAnimation(pulse);
  }, [index, pulse, reduceMotion, startAt]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value * 0.9, transform: [{ scale: interpolate(pulse.value, [0, 1], [0.4, 1]) }] }));

  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: size, backgroundColor: brand.onHero }, style]}
    />
  );
}

type BlobProps = {
  left: number;
  top: number;
  size: number;
  color: string;
  strength: number;
  id: string;
  drift: { x: number; y: number; from: number; to: number; seconds: number };
  reverse?: boolean;
  intro: Intro;
};

function AuroraBlob({ left, top, size, color, strength, id, drift, reverse, intro }: BlobProps) {
  const reduceMotion = useReducedMotion();
  const sway = useSharedValue(reverse ? 1 : 0);
  const fade = useSharedValue(intro && !reduceMotion ? 0 : 1);

  useEffect(() => {
    if (reduceMotion) return;
    sway.value = withRepeat(withTiming(reverse ? 0 : 1, { duration: drift.seconds * 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
    if (intro) fade.value = withTiming(1, { duration: intro.fadeMs, easing: Easing.out(Easing.ease) });
    return () => {
      cancelAnimation(sway);
      cancelAnimation(fade);
    };
  }, [drift.seconds, fade, intro, reduceMotion, reverse, sway]);

  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateX: sway.value * drift.x },
      { translateY: sway.value * drift.y },
      { scale: interpolate(sway.value, [0, 1], [drift.from, drift.to]) },
    ],
  }));

  return (
    <Animated.View style={[{ position: "absolute", left, top, width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={strength} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

type OrbitBackdropProps = {
  intro?: boolean;
  centerY: number;
  scale: number;
};

export function OrbitBackdrop({ intro = false, centerY, scale }: OrbitBackdropProps) {
  const { width, height } = useWindowDimensions();
  const aurora: Intro = intro ? { starsAt: 1200, fadeMs: 1400 } : undefined;
  const orbitIntro = (appearAt: number, spinAt: number) => (intro ? { appearAt, spinAt } : undefined);

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, width, height, backgroundColor: palette.dark.background, overflow: "hidden" }}
    >
      <AuroraBlob id="auroraViolet" left={-120} top={40} size={380} color={brand.primary} strength={0.42} intro={aurora} drift={{ x: 60, y: 40, from: 1, to: 1.2, seconds: 14 }} />
      <AuroraBlob id="auroraPink" left={width - 260} top={300} size={400} color={spaces.farm.panel[0]} strength={0.2} intro={aurora} drift={{ x: -50, y: -60, from: 1.1, to: 0.9, seconds: 17 }} />
      <AuroraBlob id="auroraLight" left={60} top={620} size={300} color={brand.primary} strength={0.18} intro={aurora} reverse drift={{ x: 60, y: 40, from: 1, to: 1.2, seconds: 19 }} />
      {stars.map(([x, y], index) => (
        <Star key={`${x}-${y}`} x={(x / DESIGN_WIDTH) * width} y={y} index={index} startAt={aurora?.starsAt ?? 0} />
      ))}
      <View
        style={{
          position: "absolute",
          left: (width - ORBIT_DIAMETER) / 2,
          top: centerY - ORBIT_DIAMETER / 2,
          width: ORBIT_DIAMETER,
          height: ORBIT_DIAMETER,
          transform: [{ scale }],
        }}
      >
        <OrbitRing diameter={ORBIT_DIAMETER} iconSize={44} orbiters={outerOrbiters} seconds={46} intro={orbitIntro(2650, 2800)} />
        <View style={{ position: "absolute", left: (ORBIT_DIAMETER - INNER) / 2, top: (ORBIT_DIAMETER - INNER) / 2, width: INNER, height: INNER }}>
          <OrbitRing diameter={INNER} iconSize={36} orbiters={innerOrbiters} seconds={30} reverse intro={orbitIntro(2800, 2950)} />
        </View>
        <View style={{ position: "absolute", left: (ORBIT_DIAMETER - MARK_SIZE) / 2, top: (ORBIT_DIAMETER - MARK_SIZE) / 2 }}>
          <HeroMark intro={intro} />
        </View>
      </View>
    </View>
  );
}
