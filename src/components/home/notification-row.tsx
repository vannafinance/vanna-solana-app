import { Image } from "expo-image";
import { ArrowDown, Check, Coins, Plus, ShieldCheck, TrendUp, Warning, type Icon } from "phosphor-react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";
import type { AppNotification, NotificationBadge } from "@/types/notification";

type NotificationRowProps = {
  notification: AppNotification;
  onAction: () => void;
};

const badges: Record<NotificationBadge, { icon: Icon; tone: "negative" | "positive" | "primary" }> = {
  warning: { icon: Warning, tone: "negative" },
  gain: { icon: TrendUp, tone: "positive" },
  earned: { icon: Coins, tone: "primary" },
  opened: { icon: Plus, tone: "primary" },
  withdrawn: { icon: ArrowDown, tone: "primary" },
  closed: { icon: Check, tone: "positive" },
  safe: { icon: ShieldCheck, tone: "positive" },
};

export function NotificationRow({ notification, onAction }: NotificationRowProps) {
  const { colors, radius, spacing } = useTheme();
  const { icon: Glyph, tone } = badges[notification.badge];

  return (
    <View style={{ flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider }}>
      <View style={{ width: 44, height: 44 }}>
        {notification.icon === "vanna" ? (
          <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.purpleTint, alignItems: "center", justifyContent: "center" }}>
            <Image source={require("../../../assets/images/vanna-mark.png")} style={{ width: 24, height: 24 }} contentFit="contain" />
          </View>
        ) : (
          <TokenIcon symbol={notification.icon} size={40} />
        )}
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 20,
            height: 20,
            borderRadius: radius.pill,
            backgroundColor: colors[tone],
            borderWidth: 2,
            borderColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Glyph size={10} color={colors.onPrimary} weight="bold" />
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <AppText variant="bodyLg" strong style={{ flex: 1 }}>
            {notification.title}
          </AppText>
          <AppText variant="body" color="textMuted">
            {notification.time}
          </AppText>
          {notification.unread ? (
            <View accessibilityLabel="Unread" style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.warning }} />
          ) : null}
        </View>
        <AppText variant="body" color="textMuted">
          {notification.message}
        </AppText>
        {notification.action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={notification.action.label}
            onPress={onAction}
            style={{
              alignSelf: "flex-start",
              marginTop: spacing.sm,
              minHeight: 44,
              paddingHorizontal: spacing.lg,
              borderRadius: radius.pill,
              backgroundColor: colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText variant="body" strong>
              {notification.action.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
