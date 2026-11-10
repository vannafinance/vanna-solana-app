import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";

import { AppText } from "./app-text";
import { emphasized } from "./motion";
import { RiseIn } from "./rise-in";
import { brand } from "./tokens";

const HEADLINE = [["Tokenized", "stocks,"], ["with", "leverage."]] as const;
const INTERVAL_MS = 3000;
const WORD_STEP_MS = 80;
const TAGLINE_OFFSET_MS = 350;
const DOTS_OFFSET_MS = 400;

// V7 welcome lines. One line is on screen at a time.
const lines: readonly { label: string; icon: IconName }[] = [
  { label: "Credit across markets", icon: "credit_card" },
  { label: "Earn on idle assets", icon: "savings" },
  { label: "Predict events", icon: "how_to_vote" },
  { label: "Farm in one tap", icon: "eco" },
];

type TaglineCycleProps = {
  startAt: number;
};

function SwapLine({ label, icon, animate }: { label: string; icon: IconName; animate: boolean }) {
  const shown = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    shown.value = 0;
    shown.value = withTiming(1, { duration: 360, easing: emphasized });
  }, [animate, label, shown]);
  const anim = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 8 }],
  }));
  return (
    <Animated.View accessibilityLiveRegion="polite" style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, anim]}>
      <Icon name={icon} size={20} color={brand.onHero} />
      <AppText variant="bodyLg" strong color="onHero">
        {label}
      </AppText>
    </Animated.View>
  );
}

export function TaglineCycle({ startAt }: TaglineCycleProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const animate = !reduceMotion;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => setIndex((current) => (current + 1) % lines.length), INTERVAL_MS);
    }, startAt + DOTS_OFFSET_MS + INTERVAL_MS);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [startAt]);

  const { label, icon } = lines[index];
  let word = 0;

  return (
    <View style={{ alignItems: "center", paddingHorizontal: 24 }}>
      <View accessibilityRole="header" style={{ alignItems: "center" }}>
        {HEADLINE.map((row) => (
          <View key={row.join(" ")} style={{ flexDirection: "row" }}>
            {row.map((text) => {
              const delay = startAt + word++ * WORD_STEP_MS;
              return (
                <RiseIn key={text} delay={animate ? delay : 0} distance={16} duration={560} style={{ marginHorizontal: 4 }}>
                  <AppText variant="heading" color="onHero" style={{ fontSize: 28, lineHeight: 36, letterSpacing: -0.28 }}>
                    {text}
                  </AppText>
                </RiseIn>
              );
            })}
          </View>
        ))}
      </View>
      <RiseIn delay={animate ? startAt + TAGLINE_OFFSET_MS : 0} distance={12} duration={520} style={{ height: 32, marginTop: 16, justifyContent: "center" }}>
        <SwapLine label={label} icon={icon} animate={animate} />
      </RiseIn>
    </View>
  );
}
