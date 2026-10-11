import { type Href, router } from "expo-router";

import { FarmPoolCard } from "@/components/farm/farm-pool-card";
import { MarginHero } from "@/components/margin/margin-hero";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { useFarmPools } from "@/hooks/use-farm-pools";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useMarginOverview } from "@/hooks/use-margin-overview";

// The Kamino pools a stock can be farmed into. Picking one opens its Deploy screen. The header is the margin account,
// shared with Margin trade.
export default function FarmPoolsScreen() {
  const headerProps = useHeaderProps();
  const margin = useMarginOverview();
  const pools = useFarmPools();

  return (
    <Screen
      gap={12}
      header={
        <SpaceHeader space="farm" {...headerProps}>
          <MarginHero module="farm" overview={margin} />
        </SpaceHeader>
      }
    >
      <ResourceView resource={pools} emptyLabel="No farm pools available">
        {(rows) =>
          rows.map((row) => <FarmPoolCard key={row.pool.symbol} row={row} onPress={() => router.push(`/farm/deploy/${row.pool.symbol}` as Href)} />)
        }
      </ResourceView>
    </Screen>
  );
}
