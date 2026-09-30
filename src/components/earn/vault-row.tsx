import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Pill } from "@/components/ui/pill";
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
  const { spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${symbol} vault, supply APY ${apy}`}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 72, opacity: pressed ? 0.7 : 1 })}
    >
      <TokenIcon symbol={symbol} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <AppText variant="bodyLg" strong>
            {symbol}
          </AppText>
          {yourSupply ? <Pill label={`You ${yourSupply}`} /> : null}
        </View>
        <AppText variant="label" color="textMuted">{`Supplied ${supplied} · Borrowed ${borrowed}`}</AppText>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <AppText variant="title" strong color="positive">
          {apy}
        </AppText>
        <AppText variant="label" color="textMuted">
          APY
        </AppText>
      </View>
    </Pressable>
  );
}
