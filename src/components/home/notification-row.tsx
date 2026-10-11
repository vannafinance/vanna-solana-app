import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";
import type { AppNotification } from "@/types/notification";

import { NotificationAvatar } from "./notification-avatar";

type NotificationRowProps = {
  notification: AppNotification;
  menu?: boolean;
  onAction?: () => void;
};

export function NotificationRow({ notification, menu = false, onAction }: NotificationRowProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        gap: spacing.md,
        paddingVertical: menu ? spacing.md : 14,
        paddingHorizontal: menu ? spacing.lg : 0,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
      }}
    >
      <NotificationAvatar icon={notification.icon} badge={notification.badge} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
          <AppText variant="body" strong style={{ flex: 1 }}>
            {notification.title}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <AppText variant="caption" color="textMuted">
              {notification.time}
            </AppText>
            {notification.unread ? (
              <View accessibilityLabel="Unread" style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.unreadDot }} />
            ) : null}
          </View>
        </View>
        <AppText variant="caption" color="textMuted">
          {notification.message}
        </AppText>
        {!menu && notification.action && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={notification.action.label}
            onPress={onAction}
            hitSlop={{ top: 6, bottom: 6 }}
            android_ripple={ripple(colors.text)}
            style={{
              alignSelf: "flex-start",
              marginTop: spacing.sm,
              height: 32,
              paddingHorizontal: 14,
              borderRadius: radius.chip,
              overflow: "hidden",
              backgroundColor: colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText variant="caption" strong>
              {notification.action.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
