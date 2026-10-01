import { View } from "react-native";

import { type ThemeColor, useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

type DetailRowProps = {
  label: string;
  value: string;
  valueColor?: ThemeColor;
  last?: boolean;
};

export function DetailRow({ label, value, valueColor = "text", last = false }: DetailRowProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        minHeight: 48,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
      }}
    >
      <AppText variant="body" color="textMuted">
        {label}
      </AppText>
      <AppText variant="body" color={valueColor} strong style={{ flexShrink: 1, textAlign: "right" }}>
        {value}
      </AppText>
    </View>
  );
}
