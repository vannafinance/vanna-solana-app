import { router } from "expo-router";
import { LockKey } from "phosphor-react-native";
import { View, useWindowDimensions } from "react-native";
import Animated, { FadeInUp, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DarkButton } from "@/components/connect/dark-button";
import { OrbitBackdrop } from "@/components/connect/orbit-backdrop";
import { TaglineCycle } from "@/components/connect/tagline-cycle";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { palette } from "@/theme/tokens";

const TAGLINE_TOP = 540;
const ACTIONS_CLEARANCE = 326;

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const rise = (delay: number) => (reduceMotion ? undefined : FadeInUp.duration(520).delay(delay));

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.background }}>
      <OrbitBackdrop intro />
      <View style={{ position: "absolute", left: 0, right: 0, top: Math.min(TAGLINE_TOP, height - ACTIONS_CLEARANCE) }}>
        <TaglineCycle intro />
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) + 16, gap: 8 }}>
        <Animated.View entering={rise(900)}>
          <Button label="Connect wallet" onPress={() => router.push("/connect")} />
        </Animated.View>
        <Animated.View entering={rise(1000)}>
          <DarkButton label="Explore first" onPress={() => router.replace("/home")} />
        </Animated.View>
        <Animated.View entering={rise(1100)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 24 }}>
          <LockKey size={14} color={palette.dark.onDisabled} />
          <AppText variant="caption" style={{ color: palette.dark.onDisabled }}>
            Your keys stay in your wallet
          </AppText>
        </Animated.View>
      </View>
    </View>
  );
}
