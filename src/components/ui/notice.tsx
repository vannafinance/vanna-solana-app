import { View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

type NoticeProps = {
  message: string;
  tone?: "info" | "error" | "warning";
};

const ICON = { info: "info", error: "error", warning: "warning" } as const;
const COLOR = { info: "textMuted", error: "negative", warning: "warning" } as const;

export function Notice({ message, tone = "info" }: NoticeProps) {
  const { spacing } = useTheme();
  const color = COLOR[tone];

  return (
    <View accessibilityRole={tone === "error" ? "alert" : undefined} style={{ flexDirection: "row", gap: 6, paddingTop: spacing.md }}>
      <Icon name={ICON[tone]} size={16} color={color} />
      <AppText variant="caption" color={color} style={{ flex: 1, lineHeight: 16 }}>
        {message}
      </AppText>
    </View>
  );
}
