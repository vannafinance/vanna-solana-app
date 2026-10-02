import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { ripple } from "@/components/ui/ripple";
import { VannaMark } from "@/components/ui/vanna-mark";
import { horizontalGradient, type Space, spaceGradients } from "@/theme/tokens";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

type Choice = {
  space: Exclude<Space, "portfolio">;
  title: string;
  audience: string;
  audienceColor: ThemeColor;
  summary: string;
  detail: string;
  icon: IconName;
};

const choices: readonly Choice[] = [
  {
    space: "earn",
    title: "Earn",
    audience: "For lenders",
    audienceColor: "positive",
    summary: "Supply USDC, SOL or stocks and earn the interest borrowers pay.",
    detail: "No leverage · Withdraw anytime",
    icon: "savings",
  },
  {
    space: "trade",
    title: "Trade",
    audience: "For traders",
    audienceColor: "link",
    summary: "Long or short TSLAx, AAPLx and pre-IPO stocks, and swap any token.",
    detail: "Up to 5x",
    icon: "candlestick_chart",
  },
  {
    space: "farm",
    title: "Farm",
    audience: "Leveraged yield",
    audienceColor: "warning",
    summary: "Keep your stock as collateral, borrow USDC or SOL and earn on Kamino.",
    detail: "Up to 5x",
    icon: "psychiatry",
  },
];

// How strongly a tile's own colour glows from its top-right corner, as a hex alpha.
const GLOW_ALPHA = "38";
const ICON_TILE = 36;

type SpaceChooserProps = {
  onChoose: (space: Choice["space"]) => void;
};

function ChoiceTile({ choice, onChoose }: { choice: Choice; onChoose: SpaceChooserProps["onChoose"] }) {
  const { colors, radius } = useTheme();
  const gradient = spaceGradients[choice.space];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${choice.title}, ${choice.audience}. ${choice.summary}`}
      onPress={() => onChoose(choice.space)}
      android_ripple={ripple(colors.text)}
      style={{ borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}
    >
      <LinearGradient pointerEvents="none" colors={[`${gradient.nav[0]}${GLOW_ALPHA}`, `${gradient.nav[0]}00`]} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.75 }} style={StyleSheet.absoluteFill} />
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: ICON_TILE, height: ICON_TILE, borderRadius: radius.sm, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            <LinearGradient colors={gradient.cta} {...horizontalGradient} style={StyleSheet.absoluteFill} />
            <Icon name={choice.icon} size={20} color="onPrimary" />
          </View>
          <AppText variant="title" style={{ flex: 1, lineHeight: 24 }}>
            {choice.title}
          </AppText>
          <AppText variant="caption" strong color={choice.audienceColor}>
            {choice.audience}
          </AppText>
        </View>
        <AppText variant="body" style={{ lineHeight: 20 }}>
          {choice.summary}
        </AppText>
        <AppText variant="caption" color="textMuted" strong style={{ lineHeight: 16 }}>
          {choice.detail}
        </AppText>
      </View>
    </Pressable>
  );
}

export function SpaceChooser({ onChoose }: SpaceChooserProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 44, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 32, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      <VannaMark size={34} />
      <View style={{ marginTop: 14, marginBottom: 6 }}>
        <AppText variant="heading" style={{ fontSize: 28, lineHeight: 36, letterSpacing: -0.28 }}>
          What do you want to do?
        </AppText>
        <AppText variant="bodyLg" color="textMuted" style={{ marginTop: 8, lineHeight: 24 }}>
          Pick one to start. Everything stays one tap away at the top.
        </AppText>
      </View>
      {choices.map((choice) => (
        <ChoiceTile key={choice.space} choice={choice} onChoose={onChoose} />
      ))}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4, paddingHorizontal: 4 }}>
        <View style={{ paddingTop: 2 }}>
          <Icon name="info" size={18} color="textMuted" />
        </View>
        <AppText variant="body" color="textMuted" style={{ flex: 1, lineHeight: 20 }}>
          New to leverage? Start with Earn. Nothing is ever liquidated there.
        </AppText>
      </View>
    </ScrollView>
  );
}
