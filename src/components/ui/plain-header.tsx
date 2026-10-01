import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { IconButton } from "./icon-button";
import { NotificationBell } from "./notification-bell";

type PlainHeaderProps = {
  title?: string;
  onBack: () => void;
  trailing?: ReactNode;
  notificationCount?: number;
  onNotifications?: () => void;
  avatar?: ReactNode;
  onAvatar?: () => void;
};

export function PlainHeader({ title, onBack, trailing, notificationCount, onNotifications, avatar, onAvatar }: PlainHeaderProps) {
  const { colors, layout, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        height: layout.headerHeight + insets.top,
        paddingTop: insets.top,
        paddingLeft: 4,
        paddingRight: 8,
      }}
    >
      <IconButton icon="arrow_back" label="Back" onPress={onBack} />
      {title ? (
        <AppText variant="title" accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontSize: 20, lineHeight: 28 }}>
          {title}
        </AppText>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {trailing}
      {onNotifications ? <NotificationBell count={notificationCount} onPress={onNotifications} /> : null}
      {avatar && onAvatar ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={onAvatar}
          style={{ width: 40, height: 40, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.border, overflow: "hidden" }}
        >
          {avatar}
        </Pressable>
      ) : null}
    </View>
  );
}
