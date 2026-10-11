import { View } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { TokenIcon } from "@/components/ui/token-icon";
import { VannaMark } from "@/components/ui/vanna-mark";
import { useTheme } from "@/theme/use-theme";
import type { ThemeColor } from "@/theme/use-theme";
import type { AppNotification, NotificationBadge } from "@/types/notification";

const badges: Record<NotificationBadge, { icon: IconName; color: ThemeColor }> = {
  warning: { icon: "warning", color: "badgeNegative" },
  gain: { icon: "trending_up", color: "badgePositive" },
  earned: { icon: "toll", color: "primary" },
  opened: { icon: "add", color: "primary" },
  withdrawn: { icon: "arrow_downward", color: "badgeInfo" },
  closed: { icon: "check", color: "badgePositive" },
  safe: { icon: "verified_user", color: "badgePositive" },
  swapped: { icon: "swap_horiz", color: "primary" },
};

type NotificationAvatarProps = {
  icon: AppNotification["icon"];
  badge: NotificationBadge;
};

export function NotificationAvatar({ icon, badge }: NotificationAvatarProps) {
  const { colors, radius } = useTheme();
  const { icon: glyph, color } = badges[badge];

  return (
    <View style={{ width: 40, height: 40 }}>
      {icon === "vanna" ? (
        <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.purpleTint, alignItems: "center", justifyContent: "center" }}>
          <VannaMark size={22} />
        </View>
      ) : (
        <TokenIcon symbol={icon} size={40} />
      )}
      <View
        style={{
          position: "absolute",
          right: -4,
          bottom: -4,
          width: 20,
          height: 20,
          borderRadius: radius.pill,
          backgroundColor: colors[color],
          borderWidth: 2,
          borderColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={glyph} size={10} color="onPrimary" />
      </View>
    </View>
  );
}
