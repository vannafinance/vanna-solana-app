import { router } from "expo-router";

import { routes } from "@/navigation/routes";

import { useNotificationFeed } from "./use-notification-feed";

export function useHeaderProps() {
  const feed = useNotificationFeed();
  return {
    notificationCount: feed.items.filter((item) => item.unread).length,
    onNotifications: () => router.push(routes.notifications),
    onAvatar: () => router.push(routes.profile),
  };
}
