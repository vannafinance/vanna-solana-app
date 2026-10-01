import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ChipRow } from "@/components/home/chip-row";
import { EmptyCard } from "@/components/home/empty-card";
import { HealthBadge } from "@/components/home/health-badge";
import { HeroMetrics } from "@/components/home/hero-metrics";
import { HomeBrand } from "@/components/home/home-brand";
import { TraderHistoryList } from "@/components/home/trader-history-list";
import { TraderPositionCard } from "@/components/home/trader-position-card";
import { ProductHeader } from "@/components/ui/product-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useTraderSummary } from "@/hooks/use-trader-summary";
import { useTheme } from "@/theme/use-theme";
import type { Position } from "@/types/portfolio";
import { routes } from "@/navigation/routes";

type Tab = "current" | "history";
type Filter = "all" | "perp" | "farm";

const filters = [
  { value: "all", label: "All" },
  { value: "perp", label: "Perps" },
  { value: "farm", label: "Farm" },
] as const;

export default function Trader() {
  const { spacing } = useTheme();
  const header = useHeaderProps();
  const { summary, marginExists, openExplorer } = useTraderSummary();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === "history" ? "history" : "current");
  const [filter, setFilter] = useState<Filter>("all");
  const [seenParam, setSeenParam] = useState(params.tab);

  if (seenParam !== params.tab) {
    setSeenParam(params.tab);
    if (params.tab === "history") setTab("history");
  }

  const openFlow = (position: Position) => router.push(position.kind === "perp" ? "/perps" : "/farm");

  return (
    <Screen
      header={
        <ProductHeader product="home" brand={<HomeBrand />} {...header}>
          <ResourceView resource={summary} emptyLabel="No trading activity yet">
            {(data) => {
              const headline = tab === "history" ? data.realizedPnl : data.pnl;
              return (
                <HeroMetrics
                  primary={[{ label: "Trader portfolio", value: formatSignedUsd(headline), positive: headline > 0n }]}
                  primaryAccessory={data.health === null ? undefined : <HealthBadge health={data.health} />}
                  secondary={[
                    { label: "Margin", value: formatUsd(data.margin) },
                    { label: "Available", value: formatUsd(data.available) },
                    { label: "Borrowed", value: formatUsd(data.borrowed) },
                  ]}
                />
              );
            }}
          </ResourceView>
        </ProductHeader>
      }
    >
      {marginExists ? (
        <ResourceView resource={summary} emptyLabel="No trading activity yet">
          {(data) => {
            const visible = data.current.filter((position) => filter === "all" || position.kind === filter);
            return (
              <View style={{ gap: spacing.lg }}>
                <SegmentedControl
                  segments={[
                    { value: "current", label: "Current", badge: String(data.current.length) },
                    { value: "history", label: "History", badge: String(data.history.length) },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
                {tab === "history" ? (
                  <TraderHistoryList history={data.history} realizedPnl={data.realizedPnl} winRateBps={data.winRateBps} onExplorer={openExplorer} />
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
                          onAddCollateral={() => openFlow(position)}
                          onClose={() => openFlow(position)}
                        />
                      ))
                    )}
                  </>
                )}
              </View>
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
  );
}
