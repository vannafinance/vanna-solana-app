import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

type EarnStatRowProps = {
  label: string;
  value: string;
  caption?: string;
  valueColor?: ThemeColor;
  first?: boolean;
};

export function EarnStatRow({ label, value, caption, valueColor = "text", first = false }: EarnStatRowProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        minHeight: 52,
        paddingVertical: spacing.sm,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <AppText color="textMuted" style={{ flexShrink: 1 }}>
        {label}
      </AppText>
      <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
        <AppText strong color={valueColor} style={{ textAlign: "right" }}>
          {value}
        </AppText>
        {caption ? (
          <AppText variant="caption" color="textMuted" style={{ textAlign: "right" }}>
            {caption}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
