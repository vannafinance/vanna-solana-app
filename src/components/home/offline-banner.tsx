import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";

type OfflineBannerProps = {
  staleMinutes?: number;
  onRetry: () => void;
};

export function OfflineBanner({ staleMinutes, onRetry }: OfflineBannerProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingRight: spacing.md,
        paddingLeft: 14,
        borderRadius: radius.md,
        backgroundColor: colors.pinkTint,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
        <Icon name="wifi_off" size={18} color="onPinkTint" bold />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" strong color="onPinkTint">
          You&apos;re offline
        </AppText>
        <AppText variant="caption" color="onPinkTint">
          {staleMinutes === undefined ? "Balances may be out of date. We couldn't refresh them." : `Balances are from ${staleMinutes} min ago. Trades and swaps are paused.`}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry"
        onPress={onRetry}
        hitSlop={{ top: 6, bottom: 6 }}
        android_ripple={ripple(colors.text)}
        style={{ height: 32, paddingHorizontal: 14, borderRadius: radius.chip, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" }}
      >
        <AppText variant="body" strong>
          Retry
        </AppText>
      </Pressable>
    </View>
  );
}
