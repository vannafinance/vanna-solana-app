import { router } from "expo-router";
import { useState } from "react";

import { ChipRow } from "@/components/home/chip-row";
import { HeroMetrics } from "@/components/home/hero-metrics";
import { LenderHistoryList } from "@/components/home/lender-history-list";
import { LenderVaultCard } from "@/components/home/lender-vault-card";
import { NotificationDropdown } from "@/components/home/notification-dropdown";
import { SpotList } from "@/components/home/spot-list";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SpaceHeader } from "@/components/ui/space-header";
import { formatPercent, formatUsd } from "@/format/format-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useLenderSummary } from "@/hooks/use-lender-summary";
import { useNotificationMenu } from "@/hooks/use-notification-menu";
import { usePortfolio } from "@/hooks/use-portfolio";

type Tab = "current" | "history";
type LenderView = "lending" | "spot";

const views = [
  { value: "lending", label: "Lending" },
  { value: "spot", label: "Spot" },
] as const;

export default function Lender() {
  const header = useHeaderProps();
  const menu = useNotificationMenu();
  const lender = useLenderSummary();
  const portfolio = usePortfolio();
  const [tab, setTab] = useState<Tab>("current");
  const [view, setView] = useState<LenderView>("lending");

  return (
    <>
      <Screen
        gap={12}
        header={
          <SpaceHeader space="portfolio" {...header} onNotifications={menu.toggle}>
            <ResourceView resource={lender} emptyLabel="Nothing supplied yet">
              {(data) => (
                <HeroMetrics
                  size="large"
                  primary={[{ label: "Lender portfolio", value: formatUsd(data.portfolio) }]}
                  secondary={[
                    { label: "Total holdings", value: formatUsd(data.totalHoldings) },
                    { label: "Avg supply APY", value: formatPercent(data.avgSupplyApyBps) },
                  ]}
                />
              )}
            </ResourceView>
          </SpaceHeader>
        }
      >
        <ResourceView resource={lender} emptyLabel="Nothing supplied yet">
          {(data) => (
            <>
              <SegmentedControl
                segments={[
                  { value: "current", label: "Current", badge: String(data.vaults.length) },
                  { value: "history", label: "History", badge: String(data.history.reduce((count, group) => count + group.items.length, 0)) },
                ]}
                value={tab}
                onChange={setTab}
              />
              {tab === "history" ? (
                <LenderHistoryList groups={data.history} />
              ) : (
                <>
                  <ChipRow options={views} value={view} onChange={setView} />
                  {view === "spot" ? (
                    <SpotList walletBalance={portfolio.status === "ready" ? portfolio.data.walletBalance : null} balances={data.spot} />
                  ) : (
                    data.vaults.map((vault) => (
                      <LenderVaultCard key={vault.id} vault={vault} onWithdraw={() => router.push("/earn")} onSupplyMore={() => router.push("/earn")} />
                    ))
                  )}
                </>
              )}
            </>
          )}
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
