import { router } from "expo-router";
import { View } from "react-native";

import { MarketFilterChips } from "@/components/perps/market-filter-chips";
import { MarketList } from "@/components/perps/market-list";
import { MarketSearchField } from "@/components/perps/market-search-field";
import { OpenPositionsStrip } from "@/components/perps/open-positions-strip";
import { PerpsHeader } from "@/components/perps/perps-header";
import { HeroStat } from "@/components/ui/hero-stat";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { MARKET_FILTERS, usePerpsMarkets } from "@/hooks/use-perps-markets";
import { usePerpsPositions } from "@/hooks/use-perps-positions";
import { useTheme } from "@/theme/use-theme";
import { routes } from "@/navigation/routes";

export default function PerpsMarketsScreen() {
  const headerProps = useHeaderProps();
  const { spacing } = useTheme();
  const { markets, filter, setFilter, query, setQuery } = usePerpsMarkets();
  const portfolio = usePerpsPositions();

  const header = (
    <PerpsHeader onBack={router.back} {...headerProps}>
      <ResourceView resource={portfolio} emptyLabel="No margin account yet">
        {(data) => (
          <>
            <View style={{ marginTop: spacing.lg }}>
              <HeroStat size="large" label="Net available collateral" value={formatUsd(data.account.available)} />
            </View>
            <OpenPositionsStrip
              symbols={data.positions.map((position) => position.symbol)}
              pnl={formatSignedUsd(data.openPnl)}
              pnlPositive={data.openPnl >= 0n}
              onPress={() => router.navigate(routes.tradePositions)}
            />
          </>
        )}
      </ResourceView>
    </PerpsHeader>
  );

  return (
    <Screen header={header}>
      <MarketSearchField value={query} onChangeText={setQuery} />
      <MarketFilterChips filters={MARKET_FILTERS} value={filter} onChange={setFilter} />
      <ResourceView resource={markets} emptyLabel="No markets match your search">
        {(list) => <MarketList markets={list} onSelect={(market) => router.push(`/trade/market/${market.symbol}`)} />}
      </ResourceView>
    </Screen>
  );
}
