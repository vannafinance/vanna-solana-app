import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type CardTitleProps = {
  title: string;
  subtitle?: string;
  // A figure on the right (a card total), or a link to the page with the detail.
  value?: string;
  actionLabel?: string;
  onAction?: () => void;
};

// The top of a Portfolio card: a title, one short line under it, and either a total or a link on the right.
export function CardTitle({ title, subtitle, value, actionLabel, onAction }: CardTitleProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="title" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value === undefined ? null : (
        <AppText variant="bodyLg" strong numberOfLines={1}>
          {value}
        </AppText>
      )}
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={{ left: 12, right: 12 }} style={{ minHeight: 44, justifyContent: "center" }}>
          <AppText variant="body" color="link" strong>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
