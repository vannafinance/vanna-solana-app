import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  type SharedValue,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { brand } from "@/theme/tokens";

export type Orbiter = { symbol: TokenSymbol; angle: number };

type OrbitRingProps = {
  diameter: number;
  iconSize: number;
  orbiters: readonly Orbiter[];
  seconds: number;
  reverse?: boolean;
  introDelay?: number;
};

type SatelliteProps = {
  symbol: TokenSymbol;
  size: number;
  x: number;
  y: number;
  angle: SharedValue<number>;
  direction: 1 | -1;
};

function Satellite({ symbol, size, x, y, angle, direction }: SatelliteProps) {
  const upright = useAnimatedStyle(() => ({ transform: [{ rotate: `${-direction * angle.value}deg` }] }));

  return (
    <Animated.View style={[{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size }, upright]}>
      <View style={{ borderRadius: size, borderWidth: 2, borderColor: brand.onHeroMuted, overflow: "hidden" }}>
        <TokenIcon symbol={symbol} size={size - 4} />
      </View>
    </Animated.View>
  );
}

export function OrbitRing({ diameter, iconSize, orbiters, seconds, reverse = false, introDelay }: OrbitRingProps) {
  const reduceMotion = useReducedMotion();
  const angle = useSharedValue(0);
  const radius = diameter / 2;
  const direction = reverse ? -1 : 1;

  useEffect(() => {
    if (reduceMotion) return;
    angle.value = withRepeat(withTiming(360, { duration: seconds * 1000, easing: Easing.linear }), -1);
    return () => cancelAnimation(angle);
  }, [angle, reduceMotion, seconds]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${direction * angle.value}deg` }] }));
  const entering = introDelay === undefined || reduceMotion ? undefined : FadeIn.delay(introDelay).duration(700);

  return (
    <Animated.View
      entering={entering}
      pointerEvents="none"
      style={{
        position: "absolute",
        width: diameter,
        height: diameter,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: brand.heroGlass,
      }}
    >
      <Animated.View style={[{ position: "absolute", left: -1, top: -1, width: diameter, height: diameter }, spin]}>
        {orbiters.map((orbiter) => {
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
            />
          );
        })}
      </Animated.View>
    </Animated.View>
  );
}
