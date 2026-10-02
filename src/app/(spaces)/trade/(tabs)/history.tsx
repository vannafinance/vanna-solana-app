import type { ReactNode } from "react";
import { View } from "react-native";

import { ActivityList } from "@/components/perps/activity-list";
import { HealthGauge } from "@/components/perps/health-gauge";
import { HistoryChips } from "@/components/perps/history-chips";
import { TradeHero } from "@/components/perps/trade-hero";
import { SwapHistoryList } from "@/components/swap/swap-history-list";
import { ResourceView } from "@/components/ui/resource-view";
import { SpaceHeader } from "@/components/ui/space-header";
import { formatUsd } from "@/format/format-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { type HistoryView, usePerpsHistoryView } from "@/hooks/use-perps-history-view";
import { usePerpsActivity } from "@/hooks/use-perps-activity";
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
  const { view, setView, openTransaction } = usePerpsHistoryView();
  const portfolio = usePerpsPositions();
  const activity = usePerpsActivity();
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
        onOpenTransaction={openTransaction}
      />
    );
  }

  if (portfolio.status !== "ready") return <Pending header={header(null)} resource={portfolio} emptyLabel="No margin account yet" />;
  const { account } = portfolio.data;
  const entries = activity.status === "ready" ? activity.data : [];
  const emptyLabel = activity.status === "loading" ? "Loading your history…" : activity.status === "error" ? "Your trade history is unavailable right now." : "No position activity yet";
  return (
    <ActivityList
      header={header(
        <TradeHero
          label="Position activity"
          value={activity.status === "ready" ? String(entries.length) : "—"}
          accessory={<HealthGauge health={account.health} />}
          stats={[
            { label: "Margin", value: formatUsd(account.margin) },
            { label: "Available", value: formatUsd(account.available) },
            { label: "Borrowed", value: formatUsd(account.borrowed) },
          ]}
        />,
      )}
      entries={entries}
      emptyLabel={emptyLabel}
      onOpenTransaction={openTransaction}
    />
  );
}
