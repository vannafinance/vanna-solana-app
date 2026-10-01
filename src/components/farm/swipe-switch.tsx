import type { ReactNode } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

type SwipeSwitchProps = {
  onSwitch: (direction: 1 | -1) => void;
  children: ReactNode;
};

const COMMIT_DISTANCE = 32;
const FOLLOW = 0.45;
const SLIDE = 28;
const OUT_MS = 110;
const IN_MS = 200;
const SETTLE_MS = 180;
const EASE_OUT = Easing.bezier(0.2, 0, 0, 1);
const EASE_IN = Easing.bezier(0.3, 0, 1, 1);

export function SwipeSwitch({ onSwitch, children }: SwipeSwitchProps) {
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      offset.set(event.translationX * FOLLOW);
      opacity.set(1 - Math.min(0.5, Math.abs(event.translationX) / 160));
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) < COMMIT_DISTANCE) {
        offset.set(withTiming(0, { duration: SETTLE_MS, easing: EASE_OUT }));
        opacity.set(withTiming(1, { duration: SETTLE_MS, easing: EASE_OUT }));
        return;
      }
      const direction = event.translationX < 0 ? 1 : -1;
      opacity.set(withTiming(0, { duration: OUT_MS, easing: EASE_IN }));
      offset.set(
        withTiming(-direction * SLIDE, { duration: OUT_MS, easing: EASE_IN }, (finished) => {
          if (!finished) return;
          scheduleOnRN(onSwitch, direction);
          offset.set(direction * SLIDE);
          offset.set(withTiming(0, { duration: IN_MS, easing: EASE_OUT }));
          opacity.set(withTiming(1, { duration: IN_MS, easing: EASE_OUT }));
        }),
      );
    });

  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateX: offset.get() }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
