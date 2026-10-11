import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/theme/use-theme";
import type { AppNotification } from "@/types/notification";

import { NotificationRow } from "./notification-row";

type NotificationGroupsProps = {
  notifications: readonly AppNotification[];
  onAction: (notification: AppNotification) => void;
};

const groups = [
  { key: "today", label: "Today" },
  { key: "earlier", label: "Earlier" },
] as const;

export function NotificationGroups({ notifications, onAction }: NotificationGroupsProps) {
  const { spacing } = useTheme();

  return (
    <>
      {groups.map((group) => {
        const items = notifications.filter((notification) => notification.group === group.key);
        if (items.length === 0) return null;
        return (
          <Card key={group.key} padded={false} style={{ paddingHorizontal: spacing.lg }}>
            <View style={{ height: 44, justifyContent: "center" }}>
              <AppText variant="caption" strong color="textMuted">
                {group.label}
              </AppText>
            </View>
            {items.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} onAction={() => onAction(notification)} />
            ))}
          </Card>
        );
      })}
    </>
  );
}
