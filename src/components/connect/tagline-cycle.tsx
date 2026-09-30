import { ArrowsLeftRight, HandCoins, Plant, TrendUp, type Icon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOutUp, useAnimatedStyle, useReducedMotion, withTiming } from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { brand, radius } from "@/theme/tokens";

const HEADLINE = [["Tokenized", "stocks,"], ["with", "leverage."]] as const;
const INTERVAL_MS = 3000;

const lines: readonly { label: string; icon: Icon }[] = [
  { label: "Trade stocks up to 5x", icon: TrendUp },
  { label: "Earn on idle assets", icon: HandCoins },
  { label: "Farm in one tap", icon: Plant },
  { label: "Swap any token", icon: ArrowsLeftRight },
];

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 20 : 6, { duration: 240 }),
    backgroundColor: active ? brand.onHero : brand.heroDivider,
  }));

  return <Animated.View style={[{ height: 6, borderRadius: 3 }, style]} />;
}

type TaglineCycleProps = {
  intro?: boolean;
};

export function TaglineCycle({ intro = false }: TaglineCycleProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const animate = !reduceMotion;

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % lines.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const { label, icon: Glyph } = lines[index];
  let word = 0;

  return (
    <View style={{ alignItems: "center", paddingHorizontal: 24 }}>
      <View accessibilityRole="header" style={{ alignItems: "center" }}>
        {HEADLINE.map((row) => (
          <View key={row.join(" ")} style={{ flexDirection: "row", gap: 8 }}>
            {row.map((text) => (
              <Animated.View
                key={text}
                entering={intro && animate ? FadeInDown.duration(560).delay(500 + word++ * 80) : undefined}
              >
                <AppText variant="heading" color="onHero" style={{ fontSize: 28, lineHeight: 36 }}>
                  {text}
                </AppText>
              </Animated.View>
            ))}
          </View>
        ))}
      </View>
      <View style={{ height: 32, marginTop: 16, justifyContent: "center" }} accessibilityLiveRegion="polite">
        <Animated.View
          key={label}
          entering={animate ? FadeInDown.duration(360) : undefined}
          exiting={animate ? FadeOutUp.duration(240) : undefined}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <View style={{ width: 28, height: 28, borderRadius: radius.pill, backgroundColor: brand.heroGlass, alignItems: "center", justifyContent: "center" }}>
            <Glyph size={16} color={brand.onHero} />
          </View>
          <AppText variant="bodyLg" strong color="onHero">
            {label}
          </AppText>
        </Animated.View>
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
        {lines.map((line, position) => (
          <Dot key={line.label} active={position === index} />
        ))}
      </View>
    </View>
  );
}
