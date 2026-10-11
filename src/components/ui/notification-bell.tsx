import { Pressable, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { ripple } from "./ripple";

type NotificationBellProps = {
  count?: number;
  onPress: () => void;
  color?: "text" | "onHero";
};

export function NotificationBell({ count = 0, onPress, color = "text" }: NotificationBellProps) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      android_ripple={ripple(colors[color], true)}
      hitSlop={4}
      onPress={onPress}
      style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
    >
      <Icon name="notifications" size={24} color={color} />
      {count > 0 ? (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: radius.pill,
            backgroundColor: colors.badge,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppText variant="caption" strong style={{ fontSize: 11, lineHeight: 14, color: colors.onHero }}>
            {count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
