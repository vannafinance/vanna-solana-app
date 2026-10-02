import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";

type MarginBannerProps = {
  onOpen: () => void;
};

// Shown on Markets until the wallet has a margin account, in place of a separate setup page.
export function MarginBanner({ onOpen }: MarginBannerProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open your margin account. One tap, then go long or short up to 5x"
      onPress={onOpen}
      android_ripple={ripple(colors.text)}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 72, padding: spacing.lg, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.purpleTint }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <Icon name="account_balance_wallet" size={22} color="link" />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" strong color="onPurpleTint">
          Open your margin account
        </AppText>
        <AppText variant="caption" color="onPurpleTint">
          One tap, then go long or short up to 5x
        </AppText>
      </View>
      <View style={{ height: 36, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: "center", backgroundColor: colors.primary }}>
        <AppText variant="body" strong color="onPrimary">
          Open
        </AppText>
      </View>
    </Pressable>
  );
}
