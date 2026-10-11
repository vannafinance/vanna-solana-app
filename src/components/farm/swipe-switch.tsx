import type { ReactNode } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";


// Swipe the control up for the next item and down for the previous one, like turning a dial. It sits on a dropdown, so the swipe runs
// in the same direction the list opens. The control takes the touch the moment a finger lands (so the page's own vertical scroll cannot
// win the drag), and a touch that barely moves is a tap, passed on as `onTap`.
type ItemStyle = ReturnType<typeof useItemStyle>;

type SwipeSwitchProps = {
  onSwitch: (direction: 1 | -1) => void;
  onTap: () => void;
  // The frame stays still and catches the swipe; the node it puts the given style on (the item inside it) is the one that moves.
  children: (itemStyle: ItemStyle) => ReactNode;
};

const COMMIT_DISTANCE = 24;
const TAP_DISTANCE = 8;
const FOLLOW = 0.45;
const SLIDE = 28;
const OUT_MS = 110;
const IN_MS = 200;
const SETTLE_MS = 180;
const EASE_OUT = Easing.bezier(0.2, 0, 0, 1);
const EASE_IN = Easing.bezier(0.3, 0, 1, 1);

function useItemStyle(offset: { get: () => number }, opacity: { get: () => number }) {
  return useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateY: offset.get() }] }));
}

export function SwipeSwitch({ onSwitch, onTap, children }: SwipeSwitchProps) {
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((_event, manager) => manager.activate())
    .onUpdate((event) => {
      offset.set(event.translationY * FOLLOW);
      opacity.set(1 - Math.min(0.5, Math.abs(event.translationY) / 160));
    })
    .onEnd((event) => {
      if (Math.abs(event.translationY) < TAP_DISTANCE && Math.abs(event.translationX) < TAP_DISTANCE) {
        offset.set(0);
        opacity.set(1);
        scheduleOnRN(onTap);
        return;
      }
      if (Math.abs(event.translationY) < COMMIT_DISTANCE) {
        offset.set(withTiming(0, { duration: SETTLE_MS, easing: EASE_OUT }));
        opacity.set(withTiming(1, { duration: SETTLE_MS, easing: EASE_OUT }));
        return;
      }
      const direction = event.translationY < 0 ? 1 : -1;
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

  const itemStyle = useItemStyle(offset, opacity);

  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false}>{children(itemStyle)}</View>
    </GestureDetector>
  );
}
