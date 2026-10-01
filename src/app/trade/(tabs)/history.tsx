import type { ReactNode } from "react";
import { View } from "react-native";

import { HealthGauge } from "@/components/perps/health-gauge";
import { HistoryChips } from "@/components/perps/history-chips";
import { PerpsHistoryList } from "@/components/perps/perps-history-list";
import { TradeHero } from "@/components/perps/trade-hero";
import { SwapHistoryList } from "@/components/swap/swap-history-list";
import { ResourceView } from "@/components/ui/resource-view";
import { SpaceHeader } from "@/components/ui/space-header";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { type HistoryView, usePerpsHistoryView } from "@/hooks/use-perps-history-view";
import { usePerpsPositions } from "@/hooks/use-perps-positions";
import { useSwapHistory } from "@/hooks/use-swap-history";
import { useTheme } from "@/theme/use-theme";
import type { Resource } from "@/types/resource";

const VIEWS: readonly { value: HistoryView; label: string }[] = [
  { value: "perps", label: "Perps" },
  { value: "swaps", label: "Swaps" },
];

function Pending<T>({ header, resource, emptyLabel }: { header: ReactNode; resource: Resource<T>; emptyLabel: string }) {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      <ResourceView resource={resource} emptyLabel={emptyLabel}>
        {() => null}
      </ResourceView>
    </View>
  );
}

export default function TradeHistoryScreen() {
  const headerProps = useHeaderProps();
  const { view, setView, openExplorer } = usePerpsHistoryView();
  const portfolio = usePerpsPositions();
  const swaps = useSwapHistory();

  const header = (hero: ReactNode) => (
    <>
      <SpaceHeader space="trade" {...headerProps}>
        {hero}
      </SpaceHeader>
      <HistoryChips options={VIEWS} value={view} onChange={setView} />
    </>
  );

  if (view === "swaps") {
    if (swaps.status !== "ready") return <Pending header={header(null)} resource={swaps} emptyLabel="No swaps yet" />;
    return (
      <SwapHistoryList
        header={header(<TradeHero label="Swapped in the last 30 days" value={formatUsd(swaps.data.volumeUsd)} />)}
        groups={swaps.data.groups}
      />
    );
  }

  if (portfolio.status !== "ready") return <Pending header={header(null)} resource={portfolio} emptyLabel="No margin account yet" />;
  const { account, realizedPnl, closed, winRateBps } = portfolio.data;
  return (
    <PerpsHistoryList
      header={header(
        <TradeHero
          label="Closed PnL"
          value={formatSignedUsd(realizedPnl)}
          valueColor={realizedPnl >= 0n ? "heroPositive" : "short"}
          accessory={<HealthGauge health={account.health} />}
          stats={[
            { label: "Margin", value: formatUsd(account.margin) },
            { label: "Available", value: formatUsd(account.available) },
            { label: "Borrowed", value: formatUsd(account.borrowed) },
          ]}
        />,
      )}
      closed={closed}
      winRateBps={winRateBps}
      onOpenExplorer={openExplorer}
    />
  );
}
