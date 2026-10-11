import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  Keyframe,
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { VannaMark } from "@/components/ui/vanna-mark";
import { brand, palette } from "@/theme/tokens";

import { HandshakeSeal } from "./handshake-seal";
import { emphasized } from "./motion";

export type HandshakeMode = "enter" | "wait" | "linked" | "fell" | "none";

const TILE = 52;
const DOT = 7;
const DOT_COUNT = 5;
const LINK_STEP = 1 / (DOT_COUNT - 1);
const overshoot = Easing.bezier(0.34, 1.4, 0.64, 1);

const slideIn = (from: number) =>
  new Keyframe({
    from: { opacity: 0, transform: [{ translateX: from }] },
    to: { opacity: 1, transform: [{ translateX: 0 }], easing: overshoot },
  })
    .duration(360)
    .delay(160);

function dotColor(index: number) {
  "worklet";
  return interpolateColor(index * LINK_STEP, [0, 1], [brand.short, brand.primary]);
}

function Dot({ index, mode }: { index: number; mode: HandshakeMode }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || mode === "none" || mode === "enter") return;
    if (mode === "wait") {
      progress.value = withDelay(index * 120, withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1));
    } else if (mode === "linked") {
      progress.value = withDelay(index * 50, withTiming(1, { duration: 250, easing: emphasized }));
    } else {
      progress.value = withTiming(1, { duration: 220, easing: Easing.bezier(0.3, 0, 0.8, 0.15) });
    }
    return () => cancelAnimation(progress);
  }, [index, mode, progress, reduceMotion]);

  const style = useAnimatedStyle(() => {
    if (mode === "wait") {
      const pulse = interpolate(progress.value, [0, 0.2, 0.6, 1], [0, 1, 0, 0]);
      return {
        backgroundColor: interpolateColor(pulse, [0, 1], [palette.dark.border, palette.dark.link]),
        transform: [{ scale: 1 + pulse * 0.35 }],
      };
    }
    if (mode === "linked") {
      return { backgroundColor: interpolateColor(progress.value, [0, 1], [palette.dark.border, dotColor(index)]) };
    }
    if (mode === "fell") {
      return { opacity: 1 - progress.value, transform: [{ translateY: progress.value * 10 }, { scale: 1 - progress.value * 0.4 }] };
    }
    return { backgroundColor: palette.dark.border, opacity: mode === "none" ? 0.5 : 1 };
  });

  return (
    <Animated.View
      entering={mode === "enter" ? new Keyframe({ from: { opacity: 0, transform: [{ scale: 0.4 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } }).duration(200).delay(320 + index * 30) : undefined}
      style={[{ width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: palette.dark.border }, style]}
    />
  );
}

function WalletTile({ mode }: { mode: HandshakeMode }) {
  const nudge = useSharedValue(0);

  useEffect(() => {
    if (mode !== "fell") return;
    nudge.value = withRepeat(withSequence(withTiming(-6, { duration: 70 }), withTiming(6, { duration: 140 }), withTiming(0, { duration: 70 })), 2);
    return () => cancelAnimation(nudge);
  }, [mode, nudge]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }] }));
  const empty = mode === "none";
  const linked = mode === "linked";

  return (
    <Animated.View
      entering={mode === "enter" ? slideIn(46) : undefined}
      style={[
        {
          width: TILE,
          height: TILE,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: empty || linked ? "transparent" : palette.dark.border,
          borderWidth: empty ? 2 : 0,
          borderStyle: "dashed",
          borderColor: palette.dark.border,
        },
        style,
      ]}
    >
      {linked ? <HandshakeSeal /> : empty ? null : <Icon name="account_balance_wallet" size={22} color={brand.onHero} />}
    </Animated.View>
  );
}

export function Handshake({ mode }: { mode: HandshakeMode }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
      <Animated.View
        entering={mode === "enter" ? slideIn(-46) : undefined}
        style={{
          width: TILE,
          height: TILE,
          borderRadius: 16,
          backgroundColor: brand.onHero,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 10, color: palette.dark.purpleTint }],
        }}
      >
        <VannaMark size={30} />
      </Animated.View>
      <View style={{ flexDirection: "row", gap: DOT, marginHorizontal: 10 }}>
        {Array.from({ length: DOT_COUNT }, (_, index) => (
          <Dot key={`${mode}-${index}`} index={index} mode={mode} />
        ))}
      </View>
      <WalletTile mode={mode} />
    </View>
  );
}
