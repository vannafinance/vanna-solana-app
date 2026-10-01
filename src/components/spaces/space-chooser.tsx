import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { VannaMark } from "@/components/ui/vanna-mark";
import type { Space } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type Choice = { space: Exclude<Space, "portfolio">; title: string; summary: string; detail: string; icon: IconName };

const choices: readonly Choice[] = [
  {
    space: "earn",
    title: "Earn",
    summary: "Supply USDC, SOL or stocks and earn the interest borrowers pay.",
    detail: "For lenders · No leverage · Withdraw anytime",
    icon: "savings",
  },
  {
    space: "trade",
    title: "Trade",
    summary: "Long or short TSLAx, AAPLx and pre-IPO stocks, and swap any token.",
    detail: "For traders · Up to 5x",
    icon: "candlestick_chart",
  },
  {
    space: "farm",
    title: "Farm",
    summary: "Keep your stock as collateral, borrow USDC or SOL and earn on Kamino.",
    detail: "Leveraged yield · Up to 5x",
    icon: "psychiatry",
  },
];

type SpaceChooserProps = {
  onChoose: (space: Choice["space"]) => void;
};

function ChoiceRow({ choice, onChoose }: { choice: Choice; onChoose: SpaceChooserProps["onChoose"] }) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${choice.title}. ${choice.summary}`}
      onPress={() => onChoose(choice.space)}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingVertical: 18,
        paddingHorizontal: 4,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ paddingTop: 2 }}>
        <Icon name={choice.icon} size={28} color="link" />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="title" style={{ lineHeight: 24 }}>
          {choice.title}
        </AppText>
        <AppText variant="body" color="textMuted" style={{ lineHeight: 20 }}>
          {choice.summary}
        </AppText>
        <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
          {choice.detail}
        </AppText>
      </View>
      <View style={{ alignSelf: "center" }}>
        <Icon name="chevron_right" size={22} color="textMuted" />
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
      contentContainerStyle={{ paddingTop: insets.top + 44, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <VannaMark size={34} />
      <AppText variant="heading" style={{ marginTop: 28, fontSize: 28, lineHeight: 36, letterSpacing: -0.28 }}>
        What do you want to do?
      </AppText>
      <AppText variant="bodyLg" color="textMuted" style={{ marginTop: 8, marginBottom: 24, lineHeight: 24 }}>
        Pick one to start. Everything stays one tap away at the top.
      </AppText>
      {choices.map((choice) => (
        <ChoiceRow key={choice.space} choice={choice} onChoose={onChoose} />
      ))}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border }} />
      <AppText variant="body" color="textMuted" style={{ marginTop: 18, marginHorizontal: 4, lineHeight: 20 }}>
        New to leverage? Start with Earn. Nothing is ever liquidated there.
      </AppText>
    </ScrollView>
  );
}
