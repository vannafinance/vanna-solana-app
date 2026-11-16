import { type ReactNode, useEffect } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { emphasized } from "./motion";

// Fade and slide up while staying in the normal layout. The entering-animation
// version pulled these views out of the row, so the headline and the buttons stacked.
export function RiseIn({
  delay = 0,
  distance = 12,
  duration = 520,
  style,
  children,
}: {
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    shown.value = withDelay(delay, withTiming(1, { duration, easing: emphasized }));
    return () => cancelAnimation(shown);
  }, [delay, duration, reduceMotion, shown]);

  const anim = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * distance }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
