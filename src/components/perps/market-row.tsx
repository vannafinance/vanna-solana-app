import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { sideLabel } from "@/format/format-perps";
import { useTheme } from "@/theme/use-theme";
import type { MarketExposure } from "@/types/perps";

import { SideTag } from "./side-tag";

// The fixed widths of the number columns, shared by the header row of the market table so labels sit over their figures.
// Sized to the figures they hold, so the longest symbol (ANTHROPIC) and its tags still fit the market column at 412 dp.
// The header label of the APY column is wider than its figures and reaches left into the gap (see `MarketList`).
export const MARKET_COLUMNS = { gap: 10, apy: 48, liquidity: 58, price: 70 } as const;

export type MarketRowProps = {
  symbol: TokenSymbol;
  // The full pair, for screen readers; the row shows the token symbol only, since every market is quoted in USDC.
  pair: string;
  borrowApy: string;
  liquidity: string;
  price: string;
  watched: boolean;
  // The most leverage the market allows, shown as a small tag under the symbol.
  maxLeverage?: number;
  // The user's own position in this market, shown as a side tag under the symbol.
  open?: MarketExposure | null;
  onPress: () => void;
};

function LeverageTag({ leverage }: { leverage: number }) {
  const { colors, radius } = useTheme();

  return (
    <View style={{ height: 20, paddingHorizontal: 5, borderRadius: radius.tag, justifyContent: "center", backgroundColor: colors.purpleTint }}>
      <AppText variant="caption" strong color="onPurpleTint" style={{ lineHeight: 20 }}>{`${leverage}x`}</AppText>
    </View>
  );
}

function NumberCell({ width, value, strong = false }: { width: number; value: string; strong?: boolean }) {
  return (
    <AppText variant="body" strong={strong} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ width, textAlign: "right" }}>
      {value}
    </AppText>
  );
}

// One market as a row of the market table: the token on the left, then borrow APY, liquidity and price in fixed columns.
export function MarketRow({ symbol, pair, borrowApy, liquidity, price, watched, maxLeverage, open, onPress }: MarketRowProps) {
  const { colors } = useTheme();
  const label = [
    pair,
    maxLeverage ? `up to ${maxLeverage}x leverage` : null,
    `borrow APY ${borrowApy}`,
    `liquidity ${liquidity}`,
    `mark price ${price}`,
    open ? `your position ${sideLabel(open.side)} ${open.leverage}x` : null,
    watched ? "on your watchlist" : null,
  ]
    .filter((part) => part !== null)
    .join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={ripple(colors.text)}
      onPress={onPress}
      style={{ minHeight: 68, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: MARKET_COLUMNS.gap }}
    >
      <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View>
          <TokenIcon symbol={symbol} size={32} />
          {watched ? (
            <View
              style={{ position: "absolute", right: -4, bottom: -4, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}
            >
              <Icon name="star" size={12} color="watchlist" filled />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="bodyLg" strong numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {symbol}
          </AppText>
          {maxLeverage || open ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {maxLeverage ? <LeverageTag leverage={maxLeverage} /> : null}
              {open ? <SideTag side={open.side} leverage={open.leverage} /> : null}
            </View>
          ) : null}
        </View>
      </View>
      <NumberCell width={MARKET_COLUMNS.apy} value={borrowApy} />
      <NumberCell width={MARKET_COLUMNS.liquidity} value={liquidity} />
      <NumberCell width={MARKET_COLUMNS.price} value={price} strong />
    </Pressable>
  );
}
