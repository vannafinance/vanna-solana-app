import { ArrowsDownUp } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type LeverageSliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

const THUMB = 28;
const TRACK = 4;
const DOT = 14;
const HIT_WIDTH = 44;
const HIT_HEIGHT = 60;
const THUMB_TOP = 7;

export function LeverageSlider({ value, min, max, onChange }: LeverageSliderProps) {
  const { colors, radius } = useTheme();
  const [width, setWidth] = useState(0);
  const steps = max - min;
  const stepWidth = Math.max(width - THUMB, 1) / steps;
  const position = useSharedValue(value - min);
  const lastStep = useSharedValue(value - min);

  useEffect(() => {
    position.set(withSpring(value - min));
    lastStep.set(value - min);
  }, [value, min, position, lastStep]);

  const pan = Gesture.Pan()
    .minDistance(4)
    .onUpdate((event) => {
      const raw = Math.min(Math.max((event.x - THUMB / 2) / stepWidth, 0), steps);
      position.set(raw);
      const snapped = Math.round(raw);
      if (snapped !== lastStep.get()) {
        lastStep.set(snapped);
        scheduleOnRN(onChange, snapped + min);
      }
    })
    .onEnd(() => {
      position.set(withSpring(Math.round(position.get())));
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() * stepWidth }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: position.get() * stepWidth }));
  const marks = Array.from({ length: steps + 1 }, (_, index) => min + index);

  return (
    <GestureHandlerRootView style={{ height: HIT_HEIGHT + 2 }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <GestureDetector gesture={pan}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              position: "absolute",
              left: THUMB / 2,
              right: THUMB / 2,
              top: THUMB_TOP + THUMB / 2 - TRACK / 2,
              height: TRACK,
              borderRadius: radius.pill,
              backgroundColor: colors.divider,
            }}
          >
            <Animated.View style={[{ height: TRACK, borderRadius: radius.pill, overflow: "hidden" }, fillStyle]}>
              <LinearGradient colors={[colors.short, colors.primary]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
            </Animated.View>
          </View>
          {marks.map((mark, index) => (
            <Pressable
              key={mark}
              accessibilityRole="button"
              accessibilityLabel={`${mark}X leverage`}
              accessibilityState={{ selected: mark === value }}
              onPress={() => onChange(mark)}
              style={{
                position: "absolute",
                top: 0,
                left: THUMB / 2 + index * stepWidth - HIT_WIDTH / 2,
                width: HIT_WIDTH,
                height: HIT_HEIGHT,
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  marginTop: THUMB_TOP + THUMB / 2 - DOT / 2,
                  width: DOT,
                  height: DOT,
                  borderRadius: radius.pill,
                  borderWidth: 2,
                  borderColor: colors.surface,
                  backgroundColor: mark <= value ? colors.primary : colors.border,
                }}
              />
              <AppText variant="caption" strong color={mark === value ? "link" : "textMuted"}>
                {`${mark}X`}
              </AppText>
            </Pressable>
          ))}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: 0,
                top: THUMB_TOP,
                width: THUMB,
                height: THUMB,
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                elevation: 4,
              },
              thumbStyle,
            ]}
          >
            <ArrowsDownUp size={16} color={colors.onPrimary} weight="bold" />
          </Animated.View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
