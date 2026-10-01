import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";
import type { AppNotification } from "@/types/notification";

import { NotificationRow } from "./notification-row";

const MENU_OFFSET = 60;

type NotificationDropdownProps = {
  visible: boolean;
  notifications: readonly AppNotification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onSeeAll: () => void;
};

export function NotificationDropdown({ visible, notifications, onClose, onMarkAllRead, onSeeAll }: NotificationDropdownProps) {
  const { colors, radius, shadow, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close notifications"
        onPress={onClose}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.scrim }}
      />
      <View
        accessibilityViewIsModal
        style={[
          {
            position: "absolute",
            top: insets.top + MENU_OFFSET,
            left: spacing.lg,
            right: spacing.lg,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.divider,
            backgroundColor: colors.surface,
          },
          shadow.menu,
        ]}
      >
        <View style={{ height: 48, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="bodyLg" strong accessibilityRole="header">
            Notifications
          </AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Mark all read" onPress={onMarkAllRead} hitSlop={12}>
            <AppText variant="caption" strong color="link">
              Mark all read
            </AppText>
          </Pressable>
        </View>
        {notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} menu />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See all notifications"
          onPress={onSeeAll}
          android_ripple={ripple(colors.text)}
          style={{
            marginTop: spacing.xs,
            marginHorizontal: spacing.lg,
            marginBottom: spacing.sm,
            height: 44,
            borderRadius: radius.sm,
            overflow: "hidden",
            backgroundColor: colors.background,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppText variant="body" strong>
            See all notifications
          </AppText>
        </Pressable>
      </View>
    </Modal>
  );
}
