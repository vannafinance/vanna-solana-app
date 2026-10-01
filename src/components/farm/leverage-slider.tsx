import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
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

const THUMB = 28;
const MARK = 16;
const TRACK = 4;
const TRACK_TOP = 19;
const DOT = 14;
const HIT_WIDTH = 44;
const HIT_HEIGHT = 60;
const THUMB_TOP = 7;
const FILL_MS = 260;
const mark = require("../../../assets/images/vanna-mark.png");

export function LeverageSlider({ value, min, max, onChange }: LeverageSliderProps) {
  const { colors, radius } = useTheme();
  const [width, setWidth] = useState(0);
  const steps = max - min;
  const position = useSharedValue(value - min);
  const thumb = useSharedValue(value - min);
  const lastStep = useSharedValue(value - min);
  const span = useSharedValue(0);

  useEffect(() => {
    span.set(width);
  }, [width, span]);

  useEffect(() => {
    position.set(withTiming(value - min, { duration: FILL_MS, easing: Easing.out(Easing.quad) }));
    thumb.set(withSpring(value - min, { damping: 12, stiffness: 180 }));
    lastStep.set(value - min);
  }, [value, min, position, thumb, lastStep]);

  const pan = Gesture.Pan()
    .minDistance(4)
    .onUpdate((event) => {
      const raw = Math.min(Math.max((event.x / Math.max(span.get(), 1)) * steps, 0), steps);
      position.set(raw);
      thumb.set(raw);
      const snapped = Math.round(raw);
      if (snapped !== lastStep.get()) {
        lastStep.set(snapped);
        scheduleOnRN(onChange, snapped + min);
      }
    })
    .onEnd(() => {
      const snapped = Math.round(position.get());
      position.set(withTiming(snapped, { duration: FILL_MS }));
      thumb.set(withSpring(snapped, { damping: 12, stiffness: 180 }));
    });

  const fillStyle = useAnimatedStyle(() => ({ width: (position.get() / steps) * span.get() }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (thumb.get() / steps) * span.get() - THUMB / 2 }] }));
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
              backgroundColor: colors.primary,
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
          <Image source={mark} tintColor={colors.onPrimary} style={{ width: MARK, height: MARK }} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
