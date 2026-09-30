import { WifiSlash } from "phosphor-react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type OfflineBannerProps = {
  staleMinutes: number;
  onRetry: () => void;
};

export function OfflineBanner({ staleMinutes, onRetry }: OfflineBannerProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.pinkTint }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
        <WifiSlash size={20} color={colors.onPinkTint} weight="bold" />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyLg" strong style={{ color: colors.onPinkTint }}>
          You&apos;re offline
        </AppText>
        <AppText variant="body" style={{ color: colors.onPinkTint }}>
          {`Balances are from ${staleMinutes} min ago. Trades and swaps are paused.`}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry"
        onPress={onRetry}
        style={{ minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}
      >
        <AppText variant="bodyLg" strong>
          Retry
        </AppText>
      </Pressable>
    </View>
  );
}
