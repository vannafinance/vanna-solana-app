import { router } from "expo-router";

import { MarginHero } from "@/components/margin/margin-hero";
import { PerpsPositionCard } from "@/components/perps/perps-position-card";
import { TradeEarningsCard } from "@/components/perps/trade-earnings-card";
import { TradeEmptyCard } from "@/components/perps/trade-empty-card";
import { AppText } from "@/components/ui/app-text";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useMarginOverview } from "@/hooks/use-margin-overview";
import { usePerpsPositions } from "@/hooks/use-perps-positions";
import { useTradeEarnings } from "@/hooks/use-trade-earnings";

// Header = the whole margin account (health, net leverage, room before liquidation). Then net earnings over time with the
// open P&L, interest owed so far and open count, then one card per position: its side and own leverage, size, collateral
// and liquidation price. No account figure is repeated on a card.
export default function PerpsPositionsScreen() {
  const margin = useMarginOverview();
  const headerProps = useHeaderProps();
  const portfolio = usePerpsPositions();
  const { earnings, range, setRange } = useTradeEarnings(portfolio);

  return (
    <Screen
      gap={12}
      header={
        <SpaceHeader space="trade" {...headerProps}>
          <MarginHero module="trade" overview={margin} />
        </SpaceHeader>
      }
    >
      <ResourceView resource={portfolio} emptyLabel="No margin account yet">
        {(data) =>
          earnings.status === "ready" && earnings.data.noTrades ? (
            <TradeEmptyCard onBrowse={() => router.navigate("/trade")} />
          ) : (
            <>
              <TradeEarningsCard earnings={earnings} range={range} onRangeChange={setRange} />
              {data.positions.length === 0 ? (
                <AppText color="textMuted" style={{ textAlign: "center", padding: 24 }}>
                  {data.positionsAvailable ? "No open positions" : "Your positions can't be read right now. The account figures above are live."}
                </AppText>
              ) : (
                data.positions.map((position) => (
                  <PerpsPositionCard
                    key={position.id}
                    position={position}
                    onAddCollateral={() => router.push(`/trade/add-collateral/${position.id}`)}
                    onClose={() => router.push(`/trade/close/${position.id}`)}
                  />
                ))
              )}
            </>
          )
        }
      </ResourceView>
    </Screen>
  );
}
