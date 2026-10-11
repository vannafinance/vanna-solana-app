import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { brand } from "@/theme/tokens";

type VannaSealProps = {
  size?: number;
  // The tick draws in once the seal has settled; a seal still waiting for its transaction has none.
  tick?: boolean;
};

const VIEWBOX = 56;
const CENTER = 28;
const RADIUS = 23;
const AMPLITUDE = 1.8;
const LOBES = 9;
const STEPS = 120;
const TICK = "M17.5 28.5 L25 35.5 L39.5 20";
const TICK_LENGTH = 34;

const shape = Array.from({ length: STEPS + 1 }, (_, i) => {
  const angle = (i / STEPS) * 2 * Math.PI;
  const r = RADIUS + AMPLITUDE * Math.cos(LOBES * angle);
  return `${i === 0 ? "M" : "L"}${(CENTER + r * Math.cos(angle)).toFixed(2)} ${(CENTER + r * Math.sin(angle)).toFixed(2)}`;
}).join(" ") + " Z";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const SETTLE = Easing.bezier(0.34, 1.4, 0.64, 1);
const DECELERATE = Easing.bezier(0.05, 0.7, 0.1, 1);

function SealGradient() {
  return (
    <Defs>
      <LinearGradient id="vannaSeal" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={brand.coral} />
        <Stop offset="1" stopColor={brand.primary} />
      </LinearGradient>
    </Defs>
  );
}

export function VannaSeal({ size = 52, tick: showTick = true }: VannaSealProps) {
  const settle = useSharedValue(0);
  const pulse = useSharedValue(0);
  const tick = useSharedValue(TICK_LENGTH);

  useEffect(() => {
    settle.value = withTiming(1, { duration: 480, easing: SETTLE });
    pulse.value = withDelay(140, withTiming(1, { duration: 700, easing: DECELERATE }));
    tick.value = withDelay(220, withTiming(0, { duration: 280, easing: DECELERATE }));
  }, [settle, pulse, tick]);

  const shapeStyle = useAnimatedStyle(() => ({
    opacity: settle.value,
    transform: [{ scale: 0.35 + 0.65 * settle.value }, { rotate: `${-50 * (1 - settle.value)}deg` }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - pulse.value),
    transform: [{ scale: 0.85 + 0.5 * pulse.value }],
  }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: tick.value }));

  const layer = { position: "absolute", top: 0, left: 0, width: size, height: size } as const;

  return (
    <View accessibilityLabel={showTick ? "Confirmed" : "Vanna seal"} style={{ width: size, height: size }}>
      <Animated.View style={[layer, pulseStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          <SealGradient />
          <Circle cx={CENTER} cy={CENTER} r={25} fill="none" stroke="url(#vannaSeal)" strokeWidth={2} />
        </Svg>
      </Animated.View>
      <Animated.View style={[layer, shapeStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          <SealGradient />
          <Path d={shape} fill="url(#vannaSeal)" />
        </Svg>
      </Animated.View>
      {showTick ? (
        <View style={layer}>
          <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
            <AnimatedPath
              d={TICK}
              fill="none"
              stroke={brand.onPrimary}
              strokeWidth={4.6}
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeDasharray={TICK_LENGTH}
              animatedProps={tickProps}
            />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}
