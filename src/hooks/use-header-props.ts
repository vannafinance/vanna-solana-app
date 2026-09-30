import { router } from "expo-router";

import { previewSession } from "@/lib/preview-data/session";

export function useHeaderProps() {
  return {
    notificationCount: previewSession.unreadNotifications,
    onNotifications: () => router.push("/notifications"),
    onAvatar: () => router.push("/profile"),
  };
}
