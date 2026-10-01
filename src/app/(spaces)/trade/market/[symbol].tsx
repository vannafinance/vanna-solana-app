import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";

import { MarketPositionRow } from "@/components/perps/market-position-row";
import { MarketStats } from "@/components/perps/market-stats";
import { MarketSwitcher } from "@/components/perps/market-switcher";
import { PriceChart } from "@/components/perps/price-chart";
import { TimeframeTabs } from "@/components/perps/timeframe-tabs";
import { TradeActions } from "@/components/perps/trade-actions";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { PlainHeader } from "@/components/ui/plain-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { formatUsd } from "@/format/format-amount";
import { TIMEFRAMES, usePerpsMarket } from "@/hooks/use-perps-markets";
import { LIQUIDATION_HEALTH } from "@/lib/perps/account-health";
import { routes } from "@/navigation/routes";
import type { PerpsSymbol } from "@/types/perps";

const LIQUIDATION_NOTE = `You borrow from Vanna vaults to open leverage and pay the borrow APY while the position is open. If your account health reaches ${LIQUIDATION_HEALTH.toFixed(2)}, the position is liquidated with a dynamic penalty of 0–15%.`;

function SectionTitle({ title }: { title: string }) {
  return (
    <AppText variant="bodyLg" strong style={{ lineHeight: 24, marginTop: 28, marginBottom: 4 }}>
      {title}
    </AppText>
  );
}

export default function PerpsMarketScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { detail, timeframe, setTimeframe, toggleWatch } = usePerpsMarket(symbol);

  return (
    <ResourceView resource={detail} emptyLabel="Market not found">
      {({ market, markets, liquidityTokens, candles, watched, position }) => (
        <Screen
          gap={0}
          paddingTop={0}
          header={
            <PlainHeader
              onBack={router.back}
              trailing={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={watched ? `Remove ${market.pair} from watchlist` : `Add ${market.pair} to watchlist`}
                  accessibilityState={{ selected: watched }}
                  onPress={() => toggleWatch(market.symbol)}
                  style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
                >
                  <Icon name="star" size={22} color={watched ? "watchlist" : "textMuted"} filled={watched} />
                </Pressable>
              }
            />
          }
          footer={
            <TradeActions
              onLong={() => router.push(`/trade/order/${market.symbol}?side=long`)}
              onShort={() => router.push(`/trade/order/${market.symbol}?side=short`)}
            />
          }
        >
          <View style={{ marginHorizontal: 4 }}>
            <MarketSwitcher
              selected={{ symbol: market.symbol, pair: market.pair, name: market.name, price: formatUsd(market.markPrice) }}
              markets={markets.map((option) => ({ symbol: option.symbol, pair: option.pair, name: option.name, price: formatUsd(option.markPrice) }))}
              onSelect={(next: PerpsSymbol) => router.setParams({ symbol: next })}
            />
            <AppText accessibilityLabel={`Mark price ${formatUsd(market.markPrice)}`} strong style={{ marginTop: 16, fontSize: 32, lineHeight: 40, letterSpacing: -0.32 }}>
              {formatUsd(market.markPrice)}
            </AppText>
            <View style={{ marginTop: 16, marginHorizontal: -4 }}>
              {candles.length === 0 ? (
                <View style={{ height: 184, alignItems: "center", justifyContent: "center" }}>
                  <AppText variant="body" color="textMuted">
                    Price chart unavailable
                  </AppText>
                </View>
              ) : (
                <PriceChart candles={candles} lastPrice={market.markPrice} accessibilityLabel={`${market.pair} price, ${timeframe} candles`} />
              )}
            </View>
            <View style={{ marginTop: 8 }}>
              <TimeframeTabs options={TIMEFRAMES} value={timeframe} onChange={setTimeframe} />
            </View>
            {position ? (
              <>
                <SectionTitle title="Your position" />
                <MarketPositionRow position={position} onPress={() => router.navigate(routes.tradePositions)} />
              </>
            ) : null}
            <SectionTitle title="Market" />
            <MarketStats market={market} liquidityTokens={liquidityTokens} liquidationNote={LIQUIDATION_NOTE} />
          </View>
        </Screen>
      )}
    </ResourceView>
  );
}
