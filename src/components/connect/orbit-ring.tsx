import { useEffect } from "react";
import Animated, {
  Easing,
  type SharedValue,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { brand } from "@/theme/tokens";

import { emphasized } from "./motion";

export type Orbiter = { symbol: TokenSymbol; angle: number };

type OrbitTiming = { appearAt: number; spinAt: number };

type OrbitRingProps = {
  diameter: number;
  iconSize: number;
  orbiters: readonly Orbiter[];
  seconds: number;
  reverse?: boolean;
  intro?: OrbitTiming;
};

type SatelliteProps = {
  symbol: TokenSymbol;
  size: number;
  x: number;
  y: number;
  angle: SharedValue<number>;
  direction: 1 | -1;
  flyAt?: number;
};

const FLY_MS = 760;
const OVERSHOOT = 0.07;
const SETTLE_AT = 0.62;

function Satellite({ symbol, size, x, y, angle, direction, flyAt }: SatelliteProps) {
  const fly = useSharedValue(flyAt === undefined ? 1 : 0);
  const radius = size / 2;
  const fromCenterX = x - radius;
  const fromCenterY = y - radius;

  useEffect(() => {
    if (flyAt === undefined) return;
    fly.value = withDelay(flyAt, withTiming(1, { duration: FLY_MS, easing: emphasized }));
    return () => cancelAnimation(fly);
  }, [fly, flyAt]);

  const upright = useAnimatedStyle(() => ({ transform: [{ rotate: `${-direction * angle.value}deg` }] }));
  const flight = useAnimatedStyle(() => {
    const travel = interpolate(fly.value, [0, SETTLE_AT, 1], [-1, OVERSHOOT, 0]);
    return {
      opacity: interpolate(fly.value, [0, SETTLE_AT, 1], [0, 1, 1]),
      transform: [
        { translateX: travel * fromCenterX },
        { translateY: travel * fromCenterY },
        { scale: interpolate(fly.value, [0, SETTLE_AT, 1], [0.15, 1.1, 1]) },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: "absolute", left: x - radius, top: y - radius, width: size, height: size }, upright]}>
      <Animated.View style={[{ borderRadius: size, borderWidth: 2, borderColor: brand.onHeroMuted, overflow: "hidden" }, flight]}>
        <TokenIcon symbol={symbol} size={size - 4} />
      </Animated.View>
    </Animated.View>
  );
}

export function OrbitRing({ diameter, iconSize, orbiters, seconds, reverse = false, intro }: OrbitRingProps) {
  const reduceMotion = useReducedMotion();
  const angle = useSharedValue(0);
  const appear = useSharedValue(intro && !reduceMotion ? 0 : 1);
  const radius = diameter / 2;
  const direction = reverse ? -1 : 1;
  const timing = reduceMotion ? undefined : intro;

  useEffect(() => {
    if (reduceMotion) return;
    angle.value = withDelay(
      timing?.spinAt ?? 50,
      withRepeat(withTiming(360, { duration: seconds * 1000, easing: Easing.linear }), -1),
    );
    return () => cancelAnimation(angle);
  }, [angle, reduceMotion, seconds, timing?.spinAt]);

  useEffect(() => {
    if (!timing) return;
    appear.value = withDelay(timing.appearAt, withTiming(1, { duration: 700, easing: emphasized }));
    return () => cancelAnimation(appear);
  }, [appear, timing]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${direction * angle.value}deg` }] }));
  const entrance = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: interpolate(appear.value, [0, 1], [0.55, 1]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", width: diameter, height: diameter, borderRadius: radius, borderWidth: 1, borderColor: brand.heroGlass },
        entrance,
      ]}
    >
      <Animated.View style={[{ position: "absolute", left: -1, top: -1, width: diameter, height: diameter }, spin]}>
        {orbiters.map((orbiter, index) => {
          const radians = (orbiter.angle * Math.PI) / 180;
          return (
            <Satellite
              key={orbiter.symbol}
              symbol={orbiter.symbol}
              size={iconSize}
              x={radius + radius * Math.cos(radians)}
              y={radius + radius * Math.sin(radians)}
              angle={angle}
              direction={direction}
              flyAt={timing ? timing.spinAt + index * 80 : undefined}
            />
          );
        })}
      </Animated.View>
    </Animated.View>
  );
}
