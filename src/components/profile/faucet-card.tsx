import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

type FaucetCardProps = {
  onOpen: () => void;
};

const LOGOS = ["USDC", "TSLAx", "GOOGLx", "AAPLx"] as const;
const LOGO_SIZE = 28;
const LOGO_OVERLAP = 10;

// One settings row; the faucet itself opens in a sheet.
export function FaucetCard({ onOpen }: FaucetCardProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Test faucet. Get test tokens for the Vanna fork"
      onPress={onOpen}
      android_ripple={ripple(colors.text)}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 72, padding: spacing.lg, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surface }}
    >
      <View style={{ flexDirection: "row" }}>
        {LOGOS.map((symbol, index) => (
          <View key={symbol} style={{ marginLeft: index === 0 ? 0 : -LOGO_OVERLAP, borderRadius: 999, borderWidth: 2, borderColor: colors.surface }}>
            <TokenIcon symbol={symbol} size={LOGO_SIZE} />
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" strong>
          Test faucet
        </AppText>
        <AppText variant="caption" color="textMuted">
          Get test tokens for the Vanna fork
        </AppText>
      </View>
      <Icon name="chevron_right" size={22} color="textMuted" />
    </Pressable>
  );
}
