import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { formatCompactUsd, formatPercent, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { MarketListItem, PerpsMarket } from "@/types/perps";

import { MarketRow } from "./market-row";

type MarketListProps = {
  markets: readonly MarketListItem[];
  onSelect: (market: PerpsMarket) => void;
};

export function MarketList({ markets, onSelect }: MarketListProps) {
  const { colors } = useTheme();

  return (
    <Card padded={false} style={{ paddingHorizontal: 16 }}>
      <View style={{ height: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="caption" color="textMuted">
          Market
        </AppText>
        <AppText variant="caption" color="textMuted">
          Mark price
        </AppText>
      </View>
      {markets.map((market) => (
        <View key={market.symbol} style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
          <MarketRow
            symbol={market.symbol}
            pair={market.pair}
            detail={`Borrow ${formatPercent(market.tokenBorrowBps)} · Liquidity ${formatCompactUsd(market.liquidityUsd)}`}
            price={formatUsd(market.markPrice)}
            watched={market.watched}
            onPress={() => onSelect(market)}
          />
        </View>
      ))}
    </Card>
  );
}
