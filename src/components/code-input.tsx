import { LinearGradient } from "expo-linear-gradient";
import { type ComponentRef, useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { cancelAnimation, Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { font } from "@/theme/tokens";

const LEN = 6;
const LK = "#CBB6FA", BC = "#3A3944", SF = "#161618", ERR = "#FF6B72";

// Blinks like a text cursor: on, hold, off, hold.
function Caret() {
  const on = useSharedValue(1);
  useEffect(() => {
    const fade = { duration: 90, easing: Easing.linear };
    on.value = withRepeat(withSequence(withDelay(440, withTiming(0, fade)), withDelay(380, withTiming(1, fade))), -1);
    return () => cancelAnimation(on);
  }, [on]);
  const style = useAnimatedStyle(() => ({ opacity: on.value }));
  return (
    <Animated.View style={[s.caret, style]}>
      <LinearGradient colors={["#FF7679", "#A88BFF"]} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/* Six boxes over one transparent input, so a tap anywhere is a native tap on the field: that is what reliably brings the
   Android keyboard back after it was dismissed. Opens the keyboard itself when it mounts. Bump errorKey to shake. */
export function CodeInput({ value, onChange, busy, error, errorKey }: { value: string; onChange: (v: string) => void; busy?: boolean; error?: boolean; errorKey?: number }) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const x = useSharedValue(0);

  // The first focus can land while the previous step is still leaving the screen, so try again shortly after.
  useEffect(() => {
    const timers = [50, 300, 700].map((ms) => setTimeout(() => ref.current?.focus(), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!errorKey) return;
    const t = { duration: 55 };
    x.value = withSequence(withTiming(-8, t), withTiming(8, t), withTiming(-5, t), withTiming(5, t), withTiming(0, t));
    const refocus = setTimeout(() => ref.current?.focus(), 320);
    return () => clearTimeout(refocus);
  }, [errorKey, x]);

  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Animated.View style={[s.row, shake, busy && { opacity: 0.55 }]}>
      {Array.from({ length: LEN }, (_, i) => {
        const active = !busy && value.length === i;
        const filled = i < value.length;
        return (
          <View key={i} style={[s.box, filled && s.filled, active && s.active, error && s.err]}>
            {filled ? (
              <Animated.Text key={value[i]} entering={FadeIn.duration(120)} style={s.digit}>
                {value[i]}
              </Animated.Text>
            ) : active ? (
              <Caret />
            ) : (
              <Text style={s.digit}> </Text>
            )}
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, LEN))}
        autoFocus
        editable={!busy}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        maxLength={LEN}
        caretHidden
        style={s.input}
        accessibilityLabel="Six digit code"
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  box: { flex: 1, height: 60, borderRadius: 16, borderWidth: 1.5, borderColor: BC, backgroundColor: SF, alignItems: "center", justifyContent: "center" },
  filled: { borderColor: "#5B4B86" },
  active: { borderColor: LK, backgroundColor: "#1D1830" },
  err: { borderColor: ERR },
  digit: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 24, lineHeight: 30 },
  caret: { width: 2.5, height: 28, borderRadius: 2, overflow: "hidden" },
  input: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: 0, color: "transparent" },
});
