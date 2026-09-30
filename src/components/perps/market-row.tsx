import { Star } from "phosphor-react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

export type MarketRowProps = {
  symbol: TokenSymbol;
  pair: string;
  detail: string;
  price: string;
  watched: boolean;
  onPress: () => void;
};

export function MarketRow({ symbol, pair, detail, price, watched, onPress }: MarketRowProps) {
  const { colors, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pair}, ${detail}, mark price ${price}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        minHeight: 72,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <TokenIcon symbol={symbol} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText variant="bodyLg" strong>
            {pair}
          </AppText>
          {watched ? <Star size={14} weight="fill" color={colors.link} /> : null}
        </View>
        <AppText variant="label" color="textMuted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {detail}
        </AppText>
      </View>
      <AppText variant="bodyLg" strong>
        {price}
      </AppText>
    </Pressable>
  );
}
