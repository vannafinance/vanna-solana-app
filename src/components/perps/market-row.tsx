import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { sideLabel } from "@/format/format-perps";
import { useTextScale } from "@/theme/use-text-scale";
import { useTheme } from "@/theme/use-theme";
import type { MarketExposure } from "@/types/perps";

import { SideTag } from "./side-tag";

// The fixed widths of the number columns, shared by the header row of the market table so labels sit over their figures.
// Sized to the figures they hold, so the longest symbol (ANTHROPIC) and its tags still fit the market column at 412 dp.
// The header label of the APY column is wider than its figures and reaches left into the gap (see `MarketList`).
const COLUMN_BASE = { gap: 10, apy: 48, liquidity: 58, price: 70 } as const;

// The table is the densest part of the app, so its text follows the font setting only a little (`TABLE_SCALE`) and its number columns
// grow by the same amount: a bigger font setting widens them rather than cutting the figures off.
export const TABLE_SCALE = 1.05;

export function useMarketColumns() {
  const scale = useTextScale(TABLE_SCALE);
  return { gap: COLUMN_BASE.gap, apy: Math.round(COLUMN_BASE.apy * scale), liquidity: Math.round(COLUMN_BASE.liquidity * scale), price: Math.round(COLUMN_BASE.price * scale) };
}

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
    <View style={{ minHeight: 22, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.tag, justifyContent: "center", backgroundColor: colors.purpleTint }}>
      <AppText variant="caption" strong color="onPurpleTint">{`${leverage}x`}</AppText>
    </View>
  );
}

function NumberCell({ width, value, strong = false }: { width: number; value: string; strong?: boolean }) {
  return (
    <AppText variant="body" strong={strong} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} maxFontSizeMultiplier={TABLE_SCALE} style={{ width, textAlign: "right" }}>
      {value}
    </AppText>
  );
}

// One market as a row of the market table: the token on the left, then borrow APY, liquidity and price in fixed columns.
export function MarketRow({ symbol, pair, borrowApy, liquidity, price, watched, maxLeverage, open, onPress }: MarketRowProps) {
  const { colors } = useTheme();
  const columns = useMarketColumns();
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
      style={{ minHeight: 68, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: columns.gap }}
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
          <AppText variant="bodyLg" strong numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={TABLE_SCALE}>
            {symbol}
          </AppText>
          {maxLeverage || open ? (
            // The tags wrap onto a second line when the column is too narrow for both, instead of running into the figures.
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
              {maxLeverage ? <LeverageTag leverage={maxLeverage} /> : null}
              {open ? <SideTag side={open.side} leverage={open.leverage} /> : null}
            </View>
          ) : null}
        </View>
      </View>
      <NumberCell width={columns.apy} value={borrowApy} />
      <NumberCell width={columns.liquidity} value={liquidity} />
      <NumberCell width={columns.price} value={price} strong />
    </Pressable>
  );
}
