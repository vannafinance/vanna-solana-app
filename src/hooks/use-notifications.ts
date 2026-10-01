import { useState } from "react";

import type { AppNotification, NotificationKind } from "@/types/notification";
import type { Resource } from "@/types/resource";

import { useNotificationFeed } from "./use-notification-feed";

export type NotificationFilter = "all" | NotificationKind;

export function useNotifications(): {
  notifications: Resource<AppNotification[]>;
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  markAllRead: () => void;
} {
  const feed = useNotificationFeed();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const visible = filter === "all" ? feed.items : feed.items.filter((item) => item.kind === filter);

  return {
    notifications: !feed.ready ? { status: "loading" } : visible.length === 0 ? { status: "empty" } : { status: "ready", data: visible },
    filter,
    setFilter,
    markAllRead: feed.markAllRead,
  };
}
