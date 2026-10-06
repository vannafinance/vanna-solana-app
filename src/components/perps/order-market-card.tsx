import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { PerpsMarket, PerpsSymbol } from "@/types/perps";

type OrderMarketCardProps = {
  symbol: PerpsSymbol;
  pair: string;
  price: string;
  // Every market the user can trade; with more than one, the card drops a list under itself to switch to another.
  markets: readonly PerpsMarket[];
  onSelect: (symbol: PerpsSymbol) => void;
};

// The market being traded: the pair on the left, its mark price on the right. Tapping it drops the list of markets right under the
// card, so the order can move to another asset without going back; the side, amount and leverage stay as they are.
export function OrderMarketCard({ symbol, pair, price, markets, onSelect }: OrderMarketCardProps) {
  const { colors } = useTheme();
  const options = markets.map((market) => ({ value: market.symbol, label: market.pair, detail: formatUsd(market.markPrice), leading: <TokenIcon symbol={market.symbol} size={32} /> }));

  return (
    <DropdownMenu
      accessibilityLabel="Change market"
      options={options}
      value={symbol}
      onSelect={onSelect}
      renderTrigger={({ open, toggle }) => (
        <Card padded={false}>
          <Pressable
            disabled={markets.length < 2}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={`${pair}, mark price ${price}, change market`}
            android_ripple={ripple(colors.text)}
            onPress={toggle}
            style={{ height: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}
          >
            <TokenIcon symbol={symbol} size={32} />
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <AppText variant="bodyLg" strong numberOfLines={1} style={{ flexShrink: 1 }}>
                {pair}
              </AppText>
              {markets.length > 1 ? <Icon name="keyboard_arrow_down" size={20} color="textMuted" /> : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <AppText variant="body" strong>
                {price}
              </AppText>
              <AppText variant="caption" color="textMuted">
                Mark price
              </AppText>
            </View>
          </Pressable>
        </Card>
      )}
    />
  );
}
