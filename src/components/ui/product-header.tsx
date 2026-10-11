import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Product } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Glyph, type GlyphSource } from "./glyph";
import { IconButton } from "./icon-button";
import { TokenIcon } from "./token-icon";

type ProductHeaderProps = {
  product: Product;
  title?: string;
  icon?: GlyphSource;
  brand?: ReactNode;
  onBack?: () => void;
  notificationCount?: number;
  onNotifications: () => void;
  avatar?: ReactNode;
  onAvatar: () => void;
  children?: ReactNode;
};

export function ProductHeader({
  product,
  title,
  icon,
  brand,
  onBack,
  notificationCount = 0,
  onNotifications,
  avatar = <TokenIcon symbol="SOL" size={40} />,
  onAvatar,
  children,
}: ProductHeaderProps) {
  const { colors, gradients, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const gradient = gradients[product];

  return (
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      start={gradient.start}
      end={gradient.end}
      style={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        borderBottomLeftRadius: radius.hero,
        borderBottomRightRadius: radius.hero,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 52 }}>
        {onBack ? <IconButton icon="arrow_back" label="Back" tone="glass" onPress={onBack} /> : null}
        {brand}
        {icon ? (
          <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.onHero, alignItems: "center", justifyContent: "center" }}>
            <Glyph source={icon} size={22} color={colors.primary} bold />
          </View>
        ) : null}
        {title ? (
          <AppText variant="heading" color="onHero" style={{ flex: 1 }}>
            {title}
          </AppText>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View>
          <IconButton icon="notifications" label="Notifications" tone="glass" onPress={onNotifications} />
          {notificationCount > 0 ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                minWidth: 20,
                height: 20,
                paddingHorizontal: 5,
                borderRadius: radius.pill,
                backgroundColor: colors.badge,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppText variant="caption" strong color="onHero">
                {notificationCount}
              </AppText>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={onAvatar}
          style={{ width: 44, height: 44, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.onHero, overflow: "hidden" }}
        >
          {avatar}
        </Pressable>
      </View>
      {children}
    </LinearGradient>
  );
}
