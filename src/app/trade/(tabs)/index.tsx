import { router } from "expo-router";

import { MarketFilterChips } from "@/components/perps/market-filter-chips";
import { MarketList } from "@/components/perps/market-list";
import { MarketSearchField } from "@/components/perps/market-search-field";
import { TradeHero } from "@/components/perps/trade-hero";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { formatUsd } from "@/format/format-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { MARKET_FILTERS, usePerpsMarkets } from "@/hooks/use-perps-markets";
import { usePerpsPositions } from "@/hooks/use-perps-positions";
import { usePerpsTabFocus } from "@/hooks/use-perps-tab-focus";

export default function PerpsMarketsScreen() {
  usePerpsTabFocus("markets");
  const headerProps = useHeaderProps();
  const { markets, filter, setFilter, query, setQuery } = usePerpsMarkets();
  const portfolio = usePerpsPositions();

  return (
    <Screen
      gap={12}
      header={
        <SpaceHeader space="trade" {...headerProps}>
          <ResourceView resource={portfolio} emptyLabel="No margin account yet">
            {(data) => <TradeHero label="Net available collateral" value={formatUsd(data.account.available)} dimFraction />}
          </ResourceView>
        </SpaceHeader>
      }
    >
      <MarketSearchField value={query} onChangeText={setQuery} />
      <MarketFilterChips filters={MARKET_FILTERS} value={filter} onChange={setFilter} />
      <ResourceView resource={markets} emptyLabel="No markets match your search">
        {(list) => <MarketList markets={list} onSelect={(market) => router.push(`/trade/market/${market.symbol}`)} />}
      </ResourceView>
    </Screen>
  );
}
