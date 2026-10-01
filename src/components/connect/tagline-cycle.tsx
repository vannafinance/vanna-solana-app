import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOutUp, useAnimatedStyle, useReducedMotion, withTiming } from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { brand, radius } from "@/theme/tokens";

import { riseIn } from "./motion";

const HEADLINE = [["Tokenized", "stocks,"], ["with", "leverage."]] as const;
const INTERVAL_MS = 3000;
const WORD_STEP_MS = 80;
const TAGLINE_OFFSET_MS = 350;
const DOTS_OFFSET_MS = 400;

const lines: readonly { label: string; icon: IconName }[] = [
  { label: "Trade stocks up to 5x", icon: "trending_up" },
  { label: "Earn on idle assets", icon: "savings" },
  { label: "Farm in one tap", icon: "eco" },
  { label: "Swap any token", icon: "swap_horiz" },
];

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 20 : 6, { duration: 240 }),
    backgroundColor: active ? brand.onHero : brand.heroDivider,
  }));

  return <Animated.View style={[{ height: 6, borderRadius: 3 }, style]} />;
}

type TaglineCycleProps = {
  startAt: number;
};

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
            {row.map((text) => (
              <Animated.View key={text} style={{ marginHorizontal: 4 }} entering={animate ? riseIn(16, 560, startAt + word++ * WORD_STEP_MS) : undefined}>
                <AppText variant="heading" color="onHero" style={{ fontSize: 28, lineHeight: 36, letterSpacing: -0.28 }}>
                  {text}
                </AppText>
              </Animated.View>
            ))}
          </View>
        ))}
      </View>
      <Animated.View
        entering={animate ? riseIn(12, 520, startAt + TAGLINE_OFFSET_MS) : undefined}
        accessibilityLiveRegion="polite"
        style={{ height: 32, marginTop: 16, justifyContent: "center" }}
      >
        <Animated.View
          key={label}
          entering={animate ? FadeInDown.duration(360) : undefined}
          exiting={animate ? FadeOutUp.duration(240) : undefined}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <View style={{ width: 28, height: 28, borderRadius: radius.pill, backgroundColor: brand.heroGlass, alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={16} color={brand.onHero} />
          </View>
          <AppText variant="bodyLg" strong color="onHero">
            {label}
          </AppText>
        </Animated.View>
      </Animated.View>
      <Animated.View
        entering={animate ? riseIn(12, 520, startAt + DOTS_OFFSET_MS) : undefined}
        style={{ flexDirection: "row", gap: 6, marginTop: 10 }}
      >
        {lines.map((line, position) => (
          <Dot key={line.label} active={position === index} />
        ))}
      </Animated.View>
    </View>
  );
}
