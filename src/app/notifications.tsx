import { router } from "expo-router";
import { Pressable } from "react-native";

import { ChipRow } from "@/components/home/chip-row";
import { NotificationGroups } from "@/components/home/notification-groups";
import { AppText } from "@/components/ui/app-text";
import { PlainHeader } from "@/components/ui/plain-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { type NotificationFilter, useNotifications } from "@/hooks/use-notifications";

const filters: readonly { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "health", label: "Health" },
  { value: "trade", label: "Trades" },
  { value: "earn", label: "Earn" },
];

export default function Notifications() {
  const { notifications, filter, setFilter, markAllRead } = useNotifications();

  return (
    <Screen
      header={
        <PlainHeader
          title="Notifications"
          onBack={() => router.back()}
          trailing={
            <Pressable accessibilityRole="button" accessibilityLabel="Mark all read" onPress={markAllRead} hitSlop={12} style={{ minHeight: 44, justifyContent: "center" }}>
              <AppText variant="bodyLg" strong color="link">
                Mark all read
              </AppText>
            </Pressable>
          }
        />
      }
    >
      <ChipRow options={filters} value={filter} onChange={setFilter} />
      <ResourceView resource={notifications} emptyLabel="You're all caught up">
        {(items) => (
          <NotificationGroups
            notifications={items}
            onAction={(item) => router.push(item.action?.target === "farm" ? "/farm" : "/perps")}
          />
        )}
      </ResourceView>
    </Screen>
  );
}
