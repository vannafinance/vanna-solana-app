import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { ChipRow } from "@/components/home/chip-row";
import { EmptyCard } from "@/components/home/empty-card";
import { HeroHealth } from "@/components/home/hero-health";
import { HeroMetrics } from "@/components/home/hero-metrics";
import { NotificationDropdown } from "@/components/home/notification-dropdown";
import { TraderHistoryList } from "@/components/home/trader-history-list";
import { TraderPositionCard } from "@/components/home/trader-position-card";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SpaceHeader } from "@/components/ui/space-header";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useNotificationMenu } from "@/hooks/use-notification-menu";
import { useTraderSummary } from "@/hooks/use-trader-summary";
import { routes } from "@/navigation/routes";
import type { Position } from "@/types/portfolio";

type Tab = "current" | "history";
type Filter = "all" | "perp" | "farm";

const filters = [
  { value: "all", label: "All" },
  { value: "perp", label: "Perps" },
  { value: "farm", label: "Farm" },
] as const;

function addCollateralOrDetails(position: Position) {
  router.push(position.kind === "perp" ? `/trade/add-collateral/${position.id}` : `/farm/position/${position.id}`);
}

function closePosition(position: Position) {
  router.push(position.kind === "perp" ? `/trade/close/${position.id}` : `/farm/close/${position.id}`);
}

export default function Trader() {
  const header = useHeaderProps();
  const menu = useNotificationMenu();
  const { summary, marginExists, openExplorer } = useTraderSummary();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === "history" ? "history" : "current");
  const [filter, setFilter] = useState<Filter>("all");
  const [seenParam, setSeenParam] = useState(params.tab);

  if (seenParam !== params.tab) {
    setSeenParam(params.tab);
    if (params.tab === "history") setTab("history");
  }

  return (
    <>
      <Screen
        gap={12}
        header={
          <SpaceHeader space="portfolio" {...header} onNotifications={menu.toggle}>
            <ResourceView resource={summary} emptyLabel="No trading activity yet">
              {(data) => {
                const headline = tab === "history" ? data.realizedPnl : filter === "farm" ? data.farmPnl : data.perpPnl;
                return (
                  <HeroMetrics
                    size="large"
                    accessory={data.health === null ? undefined : <HeroHealth health={data.health} />}
                    primary={[{ label: "Trader portfolio", value: formatSignedUsd(headline), positive: headline >= 0n, plain: true }]}
                    secondary={[
                      { label: "Margin", value: formatUsd(data.margin) },
                      { label: "Available", value: formatUsd(data.available) },
                      { label: "Borrowed", value: formatUsd(data.borrowed) },
                    ]}
                  />
                );
              }}
            </ResourceView>
          </SpaceHeader>
        }
      >
        {marginExists ? (
          <ResourceView resource={summary} emptyLabel="No trading activity yet">
            {(data) => {
              const visible = data.current.filter((position) => filter === "all" || position.kind === filter);
              return (
                <>
                  <SegmentedControl
                    segments={[
                      { value: "current", label: "Current", badge: String(visible.length) },
                      { value: "history", label: "History", badge: String(data.history.length) },
                    ]}
                    value={tab}
                    onChange={setTab}
                  />
                  {tab === "history" ? (
                    <TraderHistoryList history={data.history} winRateBps={data.winRateBps} onExplorer={openExplorer} />
                  ) : (
                    <>
                      <ChipRow options={filters} value={filter} onChange={setFilter} />
                      {visible.length === 0 ? (
                        <EmptyCard title="No open positions" message="Positions you open in Perps or Farm show up here." />
                      ) : (
                        visible.map((position) => (
                          <TraderPositionCard
                            key={position.id}
                            position={position}
                            onPrimary={() => addCollateralOrDetails(position)}
                            onSecondary={() => closePosition(position)}
                          />
                        ))
                      )}
                    </>
                  )}
                </>
              );
            }}
          </ResourceView>
        ) : (
          <EmptyCard
            title="No margin account yet"
            message="Create one to borrow and trade with leverage in Perps and Farm."
            actionLabel="Create margin account"
            onAction={() => router.push(routes.marginCreate)}
          />
        )}
      </Screen>
      <NotificationDropdown
        visible={menu.open}
        notifications={menu.items}
        onClose={menu.close}
        onMarkAllRead={menu.markAllRead}
        onSeeAll={menu.seeAll}
      />
    </>
  );
}
