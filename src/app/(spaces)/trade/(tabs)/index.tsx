import { router } from "expo-router";

import { MarginBanner } from "@/components/margin/margin-banner";
import { MarginHero } from "@/components/margin/margin-hero";
import { MarketFilterChips } from "@/components/perps/market-filter-chips";
import { MarketList } from "@/components/perps/market-list";
import { MarketSearchField } from "@/components/perps/market-search-field";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useMarginPrompt } from "@/hooks/use-margin-prompt";
import { MARKET_FILTERS, usePerpsMarkets } from "@/hooks/use-perps-markets";
import { useMarginOverview } from "@/hooks/use-margin-overview";

// The header is the margin account (shared with Farm); the page is the list of markets to choose from.
export default function PerpsMarketsScreen() {
  const margin = useMarginOverview();
  const headerProps = useHeaderProps();
  const { markets, filter, setFilter, query, setQuery } = usePerpsMarkets();
  const prompt = useMarginPrompt();

  return (
    <Screen
      gap={12}
      header={
        <SpaceHeader space="trade" {...headerProps}>
          <MarginHero module="trade" overview={margin} />
        </SpaceHeader>
      }
    >
      {prompt.visible ? <MarginBanner onOpen={prompt.open} /> : null}
      <MarketSearchField value={query} onChangeText={setQuery} />
      <MarketFilterChips filters={MARKET_FILTERS} value={filter} onChange={setFilter} />
      <ResourceView resource={markets} emptyLabel="No markets match your search">
        {(list) => <MarketList markets={list} onSelect={(market) => router.push(`/trade/market/${market.symbol}`)} />}
      </ResourceView>
    </Screen>
  );
}
