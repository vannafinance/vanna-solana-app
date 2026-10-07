import { View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

type PillTone = "purple" | "teal" | "pink" | "long" | "short";

type PillProps = {
  label: string;
  tone?: PillTone;
  shape?: "pill" | "tag";
};

export function Pill({ label, tone = "purple", shape = "pill" }: PillProps) {
  const { colors, radius } = useTheme();
  const tag = shape === "tag";

  const palette = {
    purple: { bg: colors.purpleTint, fg: colors.onPurpleTint },
    teal: { bg: colors.tealTint, fg: colors.onTealTint },
    pink: { bg: colors.pinkTint, fg: colors.onPinkTint },
    long: { bg: colors.primary, fg: colors.onPrimary },
    short: { bg: colors.negative, fg: colors.onPrimary },
  }[tone];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        // A minimum, not a fixed height: when the label is taller (a larger font setting) the pill grows around it.
        minHeight: tag ? 22 : 24,
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: tag ? radius.tag : 11,
        backgroundColor: palette.bg,
        justifyContent: "center",
      }}
    >
      <AppText variant="caption" strong numberOfLines={1} style={{ color: palette.fg }}>
        {label}
      </AppText>
    </View>
  );
}
