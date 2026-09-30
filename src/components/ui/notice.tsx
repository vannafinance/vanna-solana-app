import { Info, WarningCircle } from "phosphor-react-native";
import { View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

type NoticeProps = {
  message: string;
  tone?: "info" | "error";
};

export function Notice({ message, tone = "info" }: NoticeProps) {
  const { colors, spacing } = useTheme();
  const error = tone === "error";
  const Glyph = error ? WarningCircle : Info;
  const color = error ? "negative" : "textMuted";

  return (
    <View accessibilityRole={error ? "alert" : undefined} style={{ flexDirection: "row", gap: spacing.sm, paddingTop: spacing.md }}>
      <Glyph size={18} color={colors[color]} style={{ marginTop: 2 }} />
      <AppText variant="body" color={color} style={{ flex: 1 }}>
        {message}
      </AppText>
    </View>
  );
}
