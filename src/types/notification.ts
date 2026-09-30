import type { AssetSymbol } from "./portfolio";

export type NotificationKind = "health" | "trade" | "earn";

export type NotificationBadge = "warning" | "gain" | "earned" | "opened" | "withdrawn" | "closed" | "safe";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  icon: AssetSymbol | "vanna";
  badge: NotificationBadge;
  title: string;
  message: string;
  time: string;
  group: "today" | "earlier";
  unread: boolean;
  action?: { label: string; target: "perps" | "farm" };
};
