import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";
import type { PerpsSymbol } from "@/types/perps";

import { AnchoredMenu } from "./anchored-menu";

export type SwitcherMarket = { symbol: PerpsSymbol; pair: string; name: string; price: string };

type MarketSwitcherProps = {
  selected: SwitcherMarket;
  markets: readonly SwitcherMarket[];
  onSelect: (symbol: PerpsSymbol) => void;
};

export function MarketSwitcher({ selected, markets, onSelect }: MarketSwitcherProps) {
  const { colors, radius } = useTheme();

  return (
    <AnchoredMenu
      label="Markets"
      scrim
      gap={28}
      renderTrigger={({ open, toggle }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch market, ${selected.pair} selected`}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "flex-start", minHeight: 44 }}
        >
          <TokenIcon symbol={selected.symbol} size={36} />
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <AppText variant="bodyLg" strong>
                {selected.pair}
              </AppText>
              <Icon name="keyboard_arrow_down" size={16} color="textMuted" rotate={open ? 180 : undefined} />
            </View>
            <AppText variant="caption" color="textMuted">
              {selected.name}
            </AppText>
          </View>
        </Pressable>
      )}
    >
      {(close) =>
        markets.map((market) => {
          const active = market.symbol === selected.symbol;
          return (
            <Pressable
              key={market.symbol}
              accessibilityRole="button"
              accessibilityLabel={`${market.pair}, ${market.price}`}
              accessibilityState={{ selected: active }}
              android_ripple={ripple(colors.text)}
              onPress={() => {
                onSelect(market.symbol);
                close();
              }}
              style={{
                height: 56,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 12,
                borderRadius: radius.sm,
                overflow: "hidden",
                backgroundColor: active ? colors.background : "transparent",
              }}
            >
              <TokenIcon symbol={market.symbol} size={32} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" strong>
                  {market.pair}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {market.name}
                </AppText>
              </View>
              <AppText variant="body" strong>
                {market.price}
              </AppText>
            </Pressable>
          );
        })
      }
    </AnchoredMenu>
  );
}
