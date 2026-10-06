import { View } from "react-native";

import { type ThemeColor, useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import type { IconName } from "./material-symbols";

export type StatusTone = "success" | "failed" | "pending" | "neutral";

const look: Record<StatusTone, { background: ThemeColor; ink: ThemeColor; icon: IconName }> = {
  success: { background: "tealTint", ink: "onTealTint", icon: "check_circle" },
  failed: { background: "pinkTint", ink: "onPinkTint", icon: "error" },
  pending: { background: "purpleTint", ink: "onPurpleTint", icon: "history" },
  neutral: { background: "segment", ink: "textMuted", icon: "info" },
};

// The state of one transaction or item, as a small tinted pill with an icon, so success and failure read at a glance.
export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  const { colors, radius } = useTheme();
  const style = look[tone];

  return (
    <View
      accessibilityLabel={label}
      style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, height: 24, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: colors[style.background] }}
    >
      <Icon name={style.icon} size={14} filled color={colors[style.ink]} />
      <AppText variant="caption" strong numberOfLines={1} style={{ color: colors[style.ink] }}>
        {label}
      </AppText>
    </View>
  );
}
