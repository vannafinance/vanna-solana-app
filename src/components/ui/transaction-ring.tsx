import { type ReactNode, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { VannaSeal } from "./vanna-seal";

export type RingKind = "wait" | "arc" | "seal" | "fail" | "off";

const SIZE = 52;
const CORE = 44;

export function TransactionRing({ kind }: { kind: RingKind }) {
  if (kind === "seal") {
    return (
      <View style={{ width: SIZE, height: SIZE }}>
        <VannaSeal size={SIZE} />
      </View>
    );
  }
  if (kind === "fail") return <FailRing />;
  if (kind === "arc") return <ArcRing />;
  return <WalletRing breathing={kind === "wait"} />;
}

function Core({ background, behind, children }: { background: string; behind?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
      {behind}
      <View style={{ width: CORE, height: CORE, borderRadius: CORE / 2, backgroundColor: background, alignItems: "center", justifyContent: "center" }}>
        {children}
      </View>
    </View>
  );
}

function WalletRing({ breathing }: { breathing: boolean }) {
  const { colors } = useTheme();
  const phase = useSharedValue(0);

  useEffect(() => {
    if (!breathing) return;
    phase.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [breathing, phase]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 - 0.17 * phase.value,
    transform: [{ scale: 1 + 0.23 * phase.value }],
  }));

  const pulse = breathing ? (
    <Animated.View style={[{ position: "absolute", width: CORE, height: CORE, borderRadius: CORE / 2, backgroundColor: colors.link }, haloStyle]} />
  ) : null;

  return (
    <Core background={breathing ? colors.purpleTint : colors.background} behind={pulse}>
      <Icon name="account_balance_wallet" size={22} color={breathing ? "onPurpleTint" : "textMuted"} />
    </Core>
  );
}

function ArcRing() {
  const { colors } = useTheme();
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
  }, [turn]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));

  return (
    <Core background={colors.purpleTint}>
      <Animated.View style={[{ position: "absolute", width: SIZE, height: SIZE }, spin]}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 52 52">
          <Circle cx={26} cy={26} r={23.5} fill="none" stroke={colors.link} strokeWidth={3.5} strokeLinecap="round" strokeDasharray="40 120" />
        </Svg>
      </Animated.View>
      <Icon name="account_balance_wallet" size={22} color="onPurpleTint" />
    </Core>
  );
}

function FailRing() {
  const { colors } = useTheme();
  const nudge = useSharedValue(0);

  useEffect(() => {
    const swing = withSequence(withTiming(-6, { duration: 70 }), withTiming(6, { duration: 140 }), withTiming(0, { duration: 70 }));
    nudge.value = withRepeat(swing, 2);
  }, [nudge]);

  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }] }));

  return (
    <Animated.View style={shake}>
      <Core background={colors.coral}>
        <AppText accessibilityLabel="Failed" variant="title" strong style={{ fontSize: 22, lineHeight: 26, color: colors.onHero }}>
          !
        </AppText>
      </Core>
    </Animated.View>
  );
}
