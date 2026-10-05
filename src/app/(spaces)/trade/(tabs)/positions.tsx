import { router } from "expo-router";
import { FlatList, View } from "react-native";

import { HealthGauge } from "@/components/perps/health-gauge";
import { PerpsPositionCard } from "@/components/perps/perps-position-card";
import { TradeHero } from "@/components/perps/trade-hero";
import { AppText } from "@/components/ui/app-text";
import { ResourceView } from "@/components/ui/resource-view";
import { SpaceHeader } from "@/components/ui/space-header";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { usePerpsPositions } from "@/hooks/use-perps-positions";
import { usePerpsTabFocus } from "@/hooks/use-perps-tab-focus";
import { useTheme } from "@/theme/use-theme";
import { useResetScrollBetweenSpaces } from "@/navigation/use-reset-scroll-between-spaces";

export default function PerpsPositionsScreen() {
  const listRef = useResetScrollBetweenSpaces();
  usePerpsTabFocus("positions");
  const { colors } = useTheme();
  const headerProps = useHeaderProps();
  const portfolio = usePerpsPositions();
  const data = portfolio.status === "ready" ? portfolio.data : null;

  const header = (
    <SpaceHeader space="trade" {...headerProps}>
      {data ? (
        <TradeHero
          label="Open PnL"
          value={data.positionsAvailable ? formatSignedUsd(data.openPnl) : "—"}
          valueColor={!data.positionsAvailable || data.openPnl >= 0n ? "heroPositive" : "short"}
          accessory={<HealthGauge health={data.account.health} />}
          stats={[
            { label: "Margin", value: formatUsd(data.account.margin) },
            { label: "Available", value: formatUsd(data.account.available) },
            { label: "Borrowed", value: formatUsd(data.account.borrowed) },
          ]}
        />
      ) : null}
    </SpaceHeader>
  );

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {header}
        <ResourceView resource={portfolio} emptyLabel="No margin account yet">
          {() => null}
        </ResourceView>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={data.positions}
      keyExtractor={(position) => position.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <AppText color="textMuted" style={{ textAlign: "center", padding: 24 }}>
          {data.positionsAvailable ? "No open positions" : "Your positions are unavailable right now. Balances above are live."}
        </AppText>
      }
      renderItem={({ item, index }) => (
        <View style={{ paddingHorizontal: 16, paddingTop: index === 0 ? 16 : 12 }}>
          <PerpsPositionCard
            position={item}
            onAddCollateral={() => router.push(`/trade/add-collateral/${item.id}`)}
            onClose={() => router.push(`/trade/close/${item.id}`)}
          />
        </View>
      )}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    />
  );
}
