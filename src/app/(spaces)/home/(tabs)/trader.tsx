import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { ChipRow } from "@/components/home/chip-row";
import { EmptyCard } from "@/components/home/empty-card";
import { NotificationDropdown } from "@/components/home/notification-dropdown";
import { PortfolioHero } from "@/components/home/portfolio-hero";
import { type HistoryFilter, TraderHistorySection } from "@/components/home/trader-history-section";
import { TraderPositionCard } from "@/components/home/trader-position-card";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SpaceHeader } from "@/components/ui/space-header";
import { useExplorer } from "@/hooks/use-explorer";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useMarginOverview } from "@/hooks/use-margin-overview";
import { useMarginActivity } from "@/hooks/use-perps-activity";
import { useNotificationMenu } from "@/hooks/use-notification-menu";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useTraderSummary } from "@/hooks/use-trader-summary";
import { routes } from "@/navigation/routes";
import type { Position } from "@/types/portfolio";

type Tab = "current" | "history";
type Filter = HistoryFilter;

const ALL_ACTIVITY = ["perps", "farm", "unclassified"] as const;

const filters = [
  { value: "all", label: "All" },
  { value: "perp", label: "Margin trade" },
  { value: "farm", label: "Farm" },
] as const;

function addCollateralOrDetails(position: Position) {
  router.push(position.kind === "perp" ? `/trade/add-collateral/${position.id}` : `/farm/position/${position.id}`);
}

function closePosition(position: Position) {
  router.push(position.kind === "perp" ? `/trade/close/${position.id}` : `/farm/close/${position.id}`);
}

// The Margin trade and Farm positions in the margin account, open now or in its history. The account's health is on Overview.
export default function Trader() {
  const header = useHeaderProps();
  const menu = useNotificationMenu();
  const margin = useMarginOverview();
  const portfolio = usePortfolio();
  const summary = useTraderSummary();
  const activity = useMarginActivity(ALL_ACTIVITY);
  const explorer = useExplorer();
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
            <PortfolioHero portfolio={portfolio} />
          </SpaceHeader>
        }
      >
        <ResourceView resource={margin} emptyLabel="No trading activity yet">
          {(account) =>
            account.hasMarginAccount ? (
              <ResourceView resource={summary} emptyLabel="No trading activity yet">
                {(data) => {
                  const visible = data.current.filter((position) => filter === "all" || position.kind === filter);
                  return (
                    <>
                      <SegmentedControl
                        segments={[
                          { value: "current", label: "Current", badge: data.positionsAvailable ? String(visible.length) : undefined },
                          { value: "history", label: "History" },
                        ]}
                        value={tab}
                        onChange={setTab}
                      />
                      <ChipRow options={filters} value={filter} onChange={setFilter} />
                      {tab === "history" ? (
                        <TraderHistorySection
                          activity={activity}
                          filter={filter}
                          onOpenTransaction={explorer.openTransaction}
                          onSeeAll={() => router.navigate(routes.tradeHistory)}
                        />
                      ) : visible.length === 0 ? (
                        data.positionsAvailable ? (
                          <EmptyCard title="No open positions" message="Open a long or short in Margin trade, or a position in Farm, and it shows up here." />
                        ) : (
                          <EmptyCard title="Positions unavailable" message="We can't load your positions right now. Try again later." />
                        )
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
                  );
                }}
              </ResourceView>
            ) : (
              <EmptyCard
                title="No margin account yet"
                message="Create one to borrow and trade with leverage in Margin trade and Farm."
                actionLabel="Create margin account"
                onAction={() => router.push(routes.marginCreate)}
              />
            )
          }
        </ResourceView>
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
