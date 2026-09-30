import { Image } from "expo-image";
import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from "react-native-svg";

import { brand, palette } from "@/theme/tokens";

import { OrbitRing, type Orbiter } from "./orbit-ring";

const OUTER = 316;
const INNER = 208;
const MARK = 104;
const RING = MARK + 8;
const CENTER_Y = 318;
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
  { x: 33, y: 81, size: 2 },
  { x: 130, y: 254, size: 3 },
  { x: 227, y: 427, size: 4 },
  { x: 324, y: 80, size: 2 },
  { x: 29, y: 253, size: 3 },
  { x: 126, y: 426, size: 4 },
  { x: 223, y: 79, size: 2 },
  { x: 320, y: 252, size: 3 },
  { x: 25, y: 425, size: 4 },
  { x: 219, y: 251, size: 3 },
] as const;

type StarProps = { x: number; y: number; size: number; index: number };

function Star({ x, y, size, index }: StarProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 0.5 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    const half = (2400 + (index % 4) * 700) / 2;
    opacity.value = withDelay(
      1200 + index * 370,
      withRepeat(withSequence(withTiming(0.9, { duration: half }), withTiming(0, { duration: half })), -1),
    );
    return () => cancelAnimation(opacity);
  }, [index, opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: size, backgroundColor: brand.onHero }, style]}
    />
  );
}

function Aurora({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={{ position: "absolute" }}>
      <Defs>
        <RadialGradient id="auroraPrimary" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={brand.primary} stopOpacity="0.42" />
          <Stop offset="1" stopColor={brand.primary} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="auroraWarm" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={brand.short} stopOpacity="0.22" />
          <Stop offset="1" stopColor={brand.short} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={70} cy={230} r={190} fill="url(#auroraPrimary)" />
      <Circle cx={width + 60} cy={500} r={200} fill="url(#auroraWarm)" />
      <Circle cx={210} cy={770} r={150} fill="url(#auroraPrimary)" opacity={0.45} />
    </Svg>
  );
}

function VannaMark({ intro }: { intro: boolean }) {
  const reduceMotion = useReducedMotion();
  const entering = intro && !reduceMotion ? ZoomIn.duration(900).easing(Easing.out(Easing.back(1.4))) : undefined;

  return (
    <Animated.View
      entering={entering}
      accessibilityLabel="Vanna"
      style={{ position: "absolute", left: -4, top: -4, width: RING, height: RING, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={RING} height={RING} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="markRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={brand.short} />
            <Stop offset="1" stopColor={brand.primary} />
          </LinearGradient>
        </Defs>
        <Circle cx={RING / 2} cy={RING / 2} r={MARK / 2 + 2} fill={palette.dark.background} stroke="url(#markRing)" strokeWidth={2.5} />
      </Svg>
      <Image source={require("../../../assets/images/vanna-mark.png")} style={{ width: 60, height: 60 }} contentFit="contain" />
    </Animated.View>
  );
}

type OrbitBackdropProps = {
  intro?: boolean;
};

export function OrbitBackdrop({ intro = false }: OrbitBackdropProps) {
  const { width, height } = useWindowDimensions();

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, width, height, backgroundColor: palette.dark.background, overflow: "hidden" }}
    >
      <Aurora width={width} height={height} />
      {stars.map((star, index) => (
        <Star key={`${star.x}-${star.y}`} x={(star.x / DESIGN_WIDTH) * width} y={star.y} size={star.size} index={index} />
      ))}
      <View style={{ position: "absolute", left: (width - OUTER) / 2, top: CENTER_Y - OUTER / 2, width: OUTER, height: OUTER }}>
        <OrbitRing diameter={OUTER} iconSize={44} orbiters={outerOrbiters} seconds={46} introDelay={intro ? 500 : undefined} />
      </View>
      <View style={{ position: "absolute", left: (width - INNER) / 2, top: CENTER_Y - INNER / 2, width: INNER, height: INNER }}>
        <OrbitRing diameter={INNER} iconSize={36} orbiters={innerOrbiters} seconds={30} reverse introDelay={intro ? 650 : undefined} />
      </View>
      <View style={{ position: "absolute", left: (width - MARK) / 2, top: CENTER_Y - MARK / 2, width: MARK, height: MARK }}>
        <VannaMark intro={intro} />
      </View>
    </View>
  );
}
