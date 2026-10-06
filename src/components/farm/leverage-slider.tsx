import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { AppText } from "@/components/ui/app-text";
import { horizontalGradient } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type LeverageSliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

const THUMB = 32;
const MARK = 22;
const TRACK = 4;
const TRACK_TOP = 19;
const DOT = 14;
const HIT_WIDTH = 44;
const HIT_HEIGHT = 60;
const THUMB_TOP = 5;
const FILL_MS = 140;
const mark = require("../../../assets/images/vanna-mark.png");

export function LeverageSlider({ value, min, max, onChange }: LeverageSliderProps) {
  const { colors, radius, scheme } = useTheme();
  const [width, setWidth] = useState(0);
  const steps = max - min;
  const position = useSharedValue(value - min);
  const lastStep = useSharedValue(value - min);
  const span = useSharedValue(0);

  useEffect(() => {
    span.set(width);
  }, [width, span]);

  // The thumb and fill only ever rest on a mark: a drag steps between marks, it never floats between them.
  useEffect(() => {
    position.set(withTiming(value - min, { duration: FILL_MS, easing: Easing.out(Easing.cubic) }));
    lastStep.set(value - min);
  }, [value, min, position, lastStep]);

  const pan = Gesture.Pan()
    .minDistance(4)
    .onUpdate((event) => {
      const snapped = Math.round(Math.min(Math.max((event.x / Math.max(span.get(), 1)) * steps, 0), steps));
      if (snapped !== lastStep.get()) {
        lastStep.set(snapped);
        position.set(withTiming(snapped, { duration: FILL_MS, easing: Easing.out(Easing.cubic) }));
        scheduleOnRN(onChange, snapped + min);
      }
    });

  const fillStyle = useAnimatedStyle(() => ({ width: (position.get() / steps) * span.get() }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (position.get() / steps) * span.get() - THUMB / 2 }] }));
  const marks = Array.from({ length: steps + 1 }, (_, index) => min + index);

  return (
    <GestureDetector gesture={pan}>
      <View style={{ height: 64, marginTop: 6, marginHorizontal: 14, marginBottom: 4 }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <View style={{ position: "absolute", left: 0, right: 0, top: TRACK_TOP, height: TRACK, borderRadius: 2, backgroundColor: colors.divider }} />
        <Animated.View style={[{ position: "absolute", left: 0, top: TRACK_TOP, height: TRACK, borderRadius: 2, overflow: "hidden" }, fillStyle]}>
          <LinearGradient colors={[colors.coral, colors.primary]} {...horizontalGradient} style={{ flex: 1 }} />
        </Animated.View>
        {marks.map((step, index) => (
          <Pressable
            key={step}
            accessibilityRole="button"
            accessibilityLabel={`${step}X leverage`}
            accessibilityState={{ selected: step === value }}
            onPress={() => onChange(step)}
            style={{
              position: "absolute",
              top: 0,
              left: (index / steps) * width - HIT_WIDTH / 2,
              width: HIT_WIDTH,
              height: HIT_HEIGHT,
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                marginTop: 14,
                width: DOT,
                height: DOT,
                borderRadius: radius.pill,
                borderWidth: 2,
                borderColor: colors.surface,
                backgroundColor: step <= value ? colors.primary : colors.border,
              }}
            />
            <AppText variant="caption" strong color={step === value ? "link" : "textMuted"}>
              {`${step}X`}
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
              // A white disc on a light card, a near-black one on a dark card: the logo keeps its own colours on either, and the purple ring marks it.
              backgroundColor: scheme === "dark" ? colors.background : "#FFFFFF",
              borderWidth: 2,
              borderColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.primary,
              shadowOpacity: 0.45,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            },
            thumbStyle,
          ]}
        >
          <Image source={mark} cachePolicy="memory" style={{ width: MARK, height: MARK }} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
