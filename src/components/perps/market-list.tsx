import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { formatCompactUsd, formatPercent } from "@/format/format-amount";
import { formatPrice } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { MarketListItem, PerpsMarket } from "@/types/perps";

import { MarketRow, TABLE_SCALE, useMarketColumns } from "./market-row";

type MarketListProps = {
  markets: readonly MarketListItem[];
  onSelect: (market: PerpsMarket) => void;
};

// A column label, right-aligned over its figures. `overhang` lets a label wider than its column reach left into the gap.
function HeaderCell({ label, width, overhang = 0 }: { label: string; width: number; overhang?: number }) {
  return (
    <AppText variant="caption" color="textMuted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={TABLE_SCALE} style={{ width: width + overhang, marginLeft: -overhang, textAlign: "right" }}>
      {label}
    </AppText>
  );
}

// The markets as a table: one header row of column labels, then one row per market with its figures in aligned columns.
export function MarketList({ markets, onSelect }: MarketListProps) {
  const { colors } = useTheme();
  const columns = useMarketColumns();

  return (
    <Card padded={false} style={{ paddingHorizontal: 16 }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ minHeight: 40, flexDirection: "row", alignItems: "center", gap: columns.gap }}>
        <AppText variant="caption" color="textMuted" style={{ flex: 1 }}>
          Market
        </AppText>
        <HeaderCell label="Borrow" width={columns.apy} overhang={12} />
        <HeaderCell label="Liquidity" width={columns.liquidity} />
        <HeaderCell label="Price" width={columns.price} />
      </View>
      {markets.map((market) => (
        <View key={market.symbol} style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
          <MarketRow
            symbol={market.symbol}
            pair={market.pair}
            borrowApy={formatPercent(market.tokenBorrowBps)}
            liquidity={formatCompactUsd(market.liquidityUsd)}
            price={formatPrice(market.markPrice)}
            watched={market.watched}
            maxLeverage={market.maxLeverage}
            open={market.open}
            onPress={() => onSelect(market)}
          />
        </View>
      ))}
    </Card>
  );
}
