import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Pill } from "@/components/ui/pill";
import { ripple } from "@/components/ui/ripple";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

export type VaultRowProps = {
  symbol: TokenSymbol;
  supplied: string;
  borrowed: string;
  apy: string;
  yourSupply?: string;
  onPress: () => void;
};

export function VaultRow({ symbol, supplied, borrowed, apy, yourSupply, onPress }: VaultRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${symbol} vault, supply APY ${apy}`}
      android_ripple={ripple(colors.text)}
      onPress={onPress}
      style={{ height: 72, flexDirection: "row", alignItems: "center", gap: 12 }}
    >
      <TokenIcon symbol={symbol} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppText variant="body" strong style={{ lineHeight: 20 }}>
            {symbol}
          </AppText>
          {yourSupply ? <Pill label={`You ${yourSupply}`} shape="tag" /> : null}
        </View>
        <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ lineHeight: 16 }}>{`Supplied ${supplied} · Borrowed ${borrowed}`}</AppText>
      </View>
      <AppText variant="bodyLg" strong color="positive" style={{ lineHeight: 20 }}>
        {apy}
      </AppText>
    </Pressable>
  );
}
