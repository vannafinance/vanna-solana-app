import { router } from "expo-router";
import { View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { HeroStage } from "@/components/connect/hero-stage";
import { riseIn } from "@/components/connect/motion";
import { PillButton } from "@/components/connect/pill-button";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useSpaceChoice } from "@/hooks/use-space-choice";
import { palette } from "@/theme/tokens";

const CONNECT_AT = 3550;
const EXPLORE_AT = 3650;
const NOTE_AT = 3750;
const SHINE_AFTER_MS = 4300;

export default function Welcome() {
  const reduceMotion = useReducedMotion();
  const { entryRoute } = useSpaceChoice();
  const rise = (delay: number) => (reduceMotion ? undefined : riseIn(12, 520, delay));

  return (
    <HeroStage intro>
      <Animated.View entering={rise(CONNECT_AT)}>
        <PillButton label="Connect wallet" height={56} shineAfter={SHINE_AFTER_MS} onPress={() => router.push("/connect")} />
      </Animated.View>
      <Animated.View entering={rise(EXPLORE_AT)}>
        <PillButton label="Explore first" tone="surface" onPress={() => router.replace(entryRoute)} />
      </Animated.View>
      <Animated.View entering={rise(NOTE_AT)}>
        <View style={{ minHeight: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icon name="lock" size={14} color={palette.dark.onDisabled} />
          <AppText variant="caption" style={{ color: palette.dark.onDisabled }}>
            Your keys stay in your wallet
          </AppText>
        </View>
      </Animated.View>
    </HeroStage>
  );
}
