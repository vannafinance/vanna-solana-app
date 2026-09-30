import { View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

type PillTone = "purple" | "teal" | "pink" | "long" | "short";

type PillProps = {
  label: string;
  tone?: PillTone;
};

export function Pill({ label, tone = "purple" }: PillProps) {
  const { colors, radius } = useTheme();

  const palette = {
    purple: { bg: colors.purpleTint, fg: colors.onPurpleTint },
    teal: { bg: colors.tealTint, fg: colors.onTealTint },
    pink: { bg: colors.pinkTint, fg: colors.onPinkTint },
    long: { bg: colors.primary, fg: colors.onPrimary },
    short: { bg: colors.negative, fg: colors.onPrimary },
  }[tone];

  return (
    <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: palette.bg }}>
      <AppText variant="label" strong style={{ color: palette.fg }}>
        {label}
      </AppText>
    </View>
  );
}
