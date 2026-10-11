import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { brand, palette } from "@/theme/tokens";

const tones = {
  primary: { background: brand.primary, foreground: brand.onHero },
  surface: { background: palette.dark.surface, foreground: brand.onHero },
  tint: { background: palette.dark.purpleTint, foreground: palette.dark.onPurpleTint },
  quiet: { background: "transparent", foreground: brand.onHero },
  muted: { background: "transparent", foreground: palette.dark.textMuted },
} as const;

const SHINE_WIDTH = 80;

type PillButtonProps = {
  label: string;
  onPress: () => void;
  tone?: keyof typeof tones;
  height?: number;
  icon?: IconName;
  shineAfter?: number;
  flex?: boolean;
};

function Shine({ width, startAfter }: { width: number; startAfter: number }) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = withDelay(
      startAfter,
      withRepeat(withSequence(withTiming(1, { duration: 1920, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 1280 }), withTiming(0, { duration: 0 })), -1),
    );
    return () => cancelAnimation(sweep);
  }, [startAfter, sweep]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(sweep.value, [0, 1], [-90, width * 1.1]) }] }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, bottom: 0, left: 0, width: SHINE_WIDTH }, style]}>
      <LinearGradient colors={["transparent", brand.heroDivider, "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
    </Animated.View>
  );
}

export function PillButton({ label, onPress, tone = "primary", height = 52, icon, shineAfter, flex = false }: PillButtonProps) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const { background, foreground } = tones[tone];
  const quiet = tone === "quiet" || tone === "muted";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={({ pressed }) => ({
        flex: flex ? 1 : undefined,
        height,
        borderRadius: height / 2,
        backgroundColor: background,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={20} color={foreground} /> : null}
      <AppText variant={quiet ? "body" : "bodyLg"} strong style={{ color: foreground }}>
        {label}
      </AppText>
      {shineAfter !== undefined && !reduceMotion && width > 0 ? <Shine width={width} startAfter={shineAfter} /> : null}
    </Pressable>
  );
}
