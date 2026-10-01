import { router } from "expo-router";

import { previewSession } from "@/lib/preview-data/session";
import { routes } from "@/navigation/routes";

export function useHeaderProps() {
  return {
    notificationCount: previewSession.unreadNotifications,
    onNotifications: () => router.push(routes.notifications),
    onAvatar: () => router.push(routes.profile),
  };
}
