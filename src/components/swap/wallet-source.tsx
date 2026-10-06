import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { shortAddress } from "@/format/short-address";
import { useTheme } from "@/theme/use-theme";

type WalletSourceProps = {
  // Null while no wallet is connected; the pill then names the wallet without an address.
  address: string | null;
};

// Says where a swap's tokens come from: the wallet, never the margin account. Leverage only exists in the margin account,
// so this is what keeps Swap from reading as part of Trade.
export function WalletSource({ address }: WalletSourceProps) {
  const { colors, radius, spacing } = useTheme();
  const short = address === null ? null : shortAddress(address);

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        accessible
        accessibilityLabel={short === null ? "Swaps from your wallet" : `Swaps from your wallet, ${short}`}
        style={{
          alignSelf: "flex-start",
          height: 32,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingLeft: 10,
          paddingRight: short === null ? 12 : 6,
          borderRadius: radius.pill,
          backgroundColor: colors.purpleTint,
        }}
      >
        <Icon name="account_balance_wallet" size={16} color="onPurpleTint" />
        <AppText variant="body" strong color="onPurpleTint" numberOfLines={1}>
          From your wallet
        </AppText>
        {short === null ? null : (
          <View style={{ height: 20, marginLeft: 2, paddingHorizontal: 6, justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.surface }}>
            <AppText variant="caption" strong color="onPurpleTint" numberOfLines={1}>
              {short}
            </AppText>
          </View>
        )}
      </View>
      <AppText variant="caption" color="textMuted">
        Uses your wallet balance. Your margin account isn&apos;t touched.
      </AppText>
    </View>
  );
}
