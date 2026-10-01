import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { useNotifications } from "@/hooks/use-notifications";
import { routes } from "@/navigation/routes";

const MENU_ITEMS = 3;

export function useNotificationMenu() {
  const [open, setOpen] = useState(false);
  const { notifications, markAllRead } = useNotifications();
  useFocusEffect(useCallback(() => () => setOpen(false), []));
  const items = notifications.status === "ready" ? notifications.data.slice(0, MENU_ITEMS) : [];

  return {
    open,
    items,
    toggle: () => setOpen((current) => !current),
    close: () => setOpen(false),
    markAllRead,
    seeAll: () => {
      setOpen(false);
      router.push(routes.notifications);
    },
  };
}
