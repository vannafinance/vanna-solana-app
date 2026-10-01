import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
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
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pair}, ${detail}, mark price ${price}`}
      android_ripple={ripple(colors.text)}
      onPress={onPress}
      style={{ height: 72, flexDirection: "row", alignItems: "center", gap: 12 }}
    >
      <TokenIcon symbol={symbol} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText variant="body" strong>
            {pair}
          </AppText>
          {watched ? <Icon name="star" size={14} color="watchlist" filled /> : null}
        </View>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {detail}
        </AppText>
      </View>
      <AppText variant="body" strong>
        {price}
      </AppText>
    </Pressable>
  );
}
