import { useState } from "react";

import { previewResource } from "@/hooks/preview-resource";
import { previewNotifications } from "@/lib/preview-data/home";
import type { AppNotification, NotificationKind } from "@/types/notification";
import type { Resource } from "@/types/resource";

export type NotificationFilter = "all" | NotificationKind;

export function useNotifications(): {
  notifications: Resource<AppNotification[]>;
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  markAllRead: () => void;
} {
  const [items, setItems] = useState(previewNotifications);
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const visible = filter === "all" ? items : items.filter((item) => item.kind === filter);

  return {
    notifications: visible.length === 0 ? { status: "empty" } : previewResource(visible),
    filter,
    setFilter,
    markAllRead: () => setItems((current) => current.map((item) => ({ ...item, unread: false }))),
  };
}
