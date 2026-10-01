import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { MarketHeader } from "@/components/perps/market-header";
import { MarketPositionRow } from "@/components/perps/market-position-row";
import { MarketStats } from "@/components/perps/market-stats";
import { PriceChart } from "@/components/perps/price-chart";
import { TimeframeTabs } from "@/components/perps/timeframe-tabs";
import { TradeActions } from "@/components/perps/trade-actions";
import { OptionSheet } from "@/components/ui/option-sheet";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatUsd } from "@/format/format-amount";
import { TIMEFRAMES, usePerpsMarket } from "@/hooks/use-perps-markets";
import { LIQUIDATION_HEALTH } from "@/lib/perps/account-health";
import { routes } from "@/navigation/routes";

const LIQUIDATION_NOTE = `You borrow from Vanna vaults to open leverage and pay the borrow APY while the position is open. If your account health reaches ${LIQUIDATION_HEALTH.toFixed(2)}, the position is liquidated with a dynamic penalty of 0–15%.`;

export default function PerpsMarketScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { detail, timeframe, setTimeframe, toggleWatch } = usePerpsMarket(symbol);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <ResourceView resource={detail} emptyLabel="Market not found">
      {({ market, markets, liquidityTokens, candles, watched, position }) => (
        <>
          <Screen
            header={
              <MarketHeader
                symbol={market.symbol}
                pair={market.pair}
                name={market.name}
                price={formatUsd(market.markPrice)}
                watched={watched}
                onBack={router.back}
                onToggleWatch={() => toggleWatch(market.symbol)}
                onOpenSwitcher={() => setSwitcherOpen(true)}
              />
            }
            footer={
              <TradeActions
                onLong={() => router.push(`/trade/order/${market.symbol}?side=long`)}
                onShort={() => router.push(`/trade/order/${market.symbol}?side=short`)}
              />
            }
          >
            <PriceChart candles={candles} accessibilityLabel={`${market.pair} price, ${timeframe} candles`} />
            <TimeframeTabs options={TIMEFRAMES} value={timeframe} onChange={setTimeframe} />
            {position ? (
              <>
                <SectionHeader title="Your position" />
                <MarketPositionRow position={position} onPress={() => router.navigate(routes.tradePositions)} />
              </>
            ) : null}
            <SectionHeader title="Market" />
            <MarketStats market={market} liquidityTokens={liquidityTokens} liquidationNote={LIQUIDATION_NOTE} />
          </Screen>
          <OptionSheet
            visible={switcherOpen}
            title="Markets"
            selected={market.symbol}
            options={markets.map((option) => ({
              value: option.symbol,
              label: option.pair,
              detail: formatUsd(option.markPrice),
              leading: <TokenIcon symbol={option.symbol} size={32} />,
            }))}
            onSelect={(value) => router.setParams({ symbol: value })}
            onDismiss={() => setSwitcherOpen(false)}
          />
        </>
      )}
    </ResourceView>
  );
}
