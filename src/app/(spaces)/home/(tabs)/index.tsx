import { router } from "expo-router";

import { EarnSummaryCard } from "@/components/home/earn-summary-card";
import { EmptyCard } from "@/components/home/empty-card";
import { MarginAccountCard } from "@/components/home/margin-account-card";
import { NotificationDropdown } from "@/components/home/notification-dropdown";
import { OfflineBanner } from "@/components/home/offline-banner";
import { PortfolioHero } from "@/components/home/portfolio-hero";
import { WalletCard } from "@/components/home/wallet-card";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useLenderSummary } from "@/hooks/use-lender-summary";
import { useMarginOverview } from "@/hooks/use-margin-overview";
import { useNotificationMenu } from "@/hooks/use-notification-menu";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useTraderSummary } from "@/hooks/use-trader-summary";
import { routes } from "@/navigation/routes";
import type { Position } from "@/types/portfolio";

// A Margin trade position opens the Trade module's positions tab; a Farm position has its own page.
function openPosition(position: Position) {
  if (position.kind === "perp") router.navigate(routes.tradePositions);
  else router.push(`/farm/position/${position.id}`);
}

// Where the money is, one card per place: the margin account (Margin trade and Farm), what is lent in Earn, and the wallet.
export default function Overview() {
  const header = useHeaderProps();
  const menu = useNotificationMenu();
  const portfolio = usePortfolio();
  const margin = useMarginOverview();
  const trader = useTraderSummary();
  const lender = useLenderSummary();
  const connectivity = useConnectivity();

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
        {connectivity.online && !(portfolio.status === "ready" && portfolio.stale) ? null : (
          <OfflineBanner
            staleMinutes={connectivity.online ? undefined : connectivity.staleMinutes}
            onRetry={portfolio.status === "ready" && portfolio.refresh ? portfolio.refresh : connectivity.retry}
          />
        )}

        <ResourceView resource={portfolio} emptyLabel="No balances yet">
          {(data) => (
            <>
              <ResourceView resource={margin} emptyLabel="No margin account yet">
                {(account) =>
                  account.hasMarginAccount ? (
                    <MarginAccountCard
                      health={account.health}
                      positions={trader.status === "ready" && trader.data.positionsAvailable ? trader.data.current : null}
                      onSeeAll={() => router.navigate("/home/trader")}
                      onOpenPosition={openPosition}
                    />
                  ) : (
                    <EmptyCard
                      title="No margin account yet"
                      message="Create one to borrow, trade with leverage and farm. It holds your collateral."
                      actionLabel="Create margin account"
                      onAction={() => router.push(routes.marginCreate)}
                    />
                  )
                }
              </ResourceView>
              <ResourceView resource={lender} emptyLabel="Nothing supplied yet">
                {(earn) => <EarnSummaryCard data={earn} onOpen={() => router.navigate("/home/lender")} onBrowse={() => router.push("/earn")} />}
              </ResourceView>
              <WalletCard total={data.walletBalance} assets={data.assets} onSwap={() => router.push(routes.swap)} />
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
