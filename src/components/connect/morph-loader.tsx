import { useEffect } from "react";
import Animated, { Easing, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

const SIZE = 18;

export function MorphLoader({ color }: { color: string }) {
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1);
    return () => cancelAnimation(turn);
  }, [turn]);

  const style = useAnimatedStyle(() => ({
    borderRadius: interpolate(turn.value, [0, 0.33, 0.66, 1], [9, 5.4, 6, 9]),
    transform: [{ rotate: `${turn.value * 360}deg` }, { scale: interpolate(turn.value, [0, 0.33, 0.66, 1], [0.9, 1, 0.85, 0.9]) }],
  }));

  return <Animated.View accessibilityLabel="Waiting" style={[{ width: SIZE, height: SIZE, backgroundColor: color }, style]} />;
}
