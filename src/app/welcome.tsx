import { type Href, router } from "expo-router";
import { Pressable, Text } from "react-native";

import { HeroStage } from "@/components/intro/hero-stage";
import { PillButton } from "@/components/intro/pill-button";
import { RiseIn } from "@/components/intro/rise-in";
import { markWelcomeSeen } from "@/state/session";
import { font } from "@/theme/tokens";

// Welcome (design SCREENS.welcome = the shipped orbit hero): the intro plays once, then Get started, Explore first and
// I have an account rise in. The actions take their space from the first frame, so the orbit never moves when they appear.
const START_AT = 3550;

export default function Welcome() {
  const enter = () => {
    markWelcomeSeen();
    router.replace("/portfolio" as Href);
  };
  return (
    <HeroStage intro>
      <RiseIn delay={START_AT} distance={12} duration={520} style={{ width: "100%" }}>
        <PillButton label="Get started" height={56} shineAfter={START_AT + 750} onPress={() => router.push({ pathname: "/sign-in", params: { mode: "new" } } as unknown as Href)} />
      </RiseIn>
      <RiseIn delay={START_AT + 100} distance={12} duration={520} style={{ width: "100%" }}>
        <PillButton label="Explore first" tone="outline" onPress={enter} />
      </RiseIn>
      <RiseIn delay={START_AT + 200} distance={12} duration={520} style={{ width: "100%" }}>
        <Pressable onPress={() => router.push({ pathname: "/sign-in", params: { mode: "back" } } as unknown as Href)} hitSlop={8} accessibilityRole="button" style={{ minHeight: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#CBB6FA" }}>I have an account</Text>
        </Pressable>
      </RiseIn>
    </HeroStage>
  );
}
