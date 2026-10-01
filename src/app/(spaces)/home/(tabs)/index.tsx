import { router } from "expo-router";
import { View } from "react-native";

import { AssetRow } from "@/components/home/asset-row";
import { EmptyCard } from "@/components/home/empty-card";
import { HeroMetrics } from "@/components/home/hero-metrics";
import { NotificationDropdown } from "@/components/home/notification-dropdown";
import { OfflineBanner } from "@/components/home/offline-banner";
import { healthLabel } from "@/components/home/position-format";
import { PositionRow } from "@/components/home/position-row";
import { Card } from "@/components/ui/card";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SpaceHeader } from "@/components/ui/space-header";
import { formatSignedUsd, formatUsd, formatUsdOrDash } from "@/format/format-amount";
import { assetDetail, changeToday } from "@/format/format-asset";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useNotificationMenu } from "@/hooks/use-notification-menu";
import { usePortfolio } from "@/hooks/use-portfolio";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme/use-theme";
import type { Portfolio, Position, TokenBalance } from "@/types/portfolio";

const PREVIEW_POSITIONS = 3;

function Positions({ positions }: { positions: Position[] }) {
  const { spacing } = useTheme();
  const shown = positions.slice(0, PREVIEW_POSITIONS);

  return (
    <>
      <View style={{ marginTop: spacing.xs }}>
        <SectionHeader title="Your positions" actionLabel="See all" onAction={() => router.navigate("/home/trader")} />
      </View>
      <Card padded={false} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
        {shown.map((position, index) => (
          <PositionRow key={position.id} position={position} first={index === 0} onPress={() => router.navigate("/home/trader")} />
        ))}
      </Card>
    </>
  );
}

function Assets({ assets }: { assets: TokenBalance[] }) {
  const { spacing } = useTheme();

  return (
    <>
      <View style={{ marginTop: spacing.xs }}>
        <SectionHeader title="Your assets" />
      </View>
      <Card padded={false} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
        {assets.map((asset, index) => (
          <AssetRow
            key={asset.symbol}
            symbol={asset.symbol}
            detail={assetDetail(asset.symbol, asset.tokens, asset.value)}
            value={formatUsd(asset.value)}
            change={asset.changeTodayBps === undefined ? undefined : changeToday(asset.changeTodayBps)}
            changeBps={asset.changeTodayBps}
            first={index === 0}
          />
        ))}
      </Card>
    </>
  );
}

function healthText(data: Portfolio) {
  if (!data.hasMarginAccount) return "—";
  return data.health === null ? "No debt" : `${data.health.toFixed(2)} · ${healthLabel(data.health)}`;
}

export default function Overview() {
  const header = useHeaderProps();
  const menu = useNotificationMenu();
  const portfolio = usePortfolio();
  const connectivity = useConnectivity();

  return (
    <>
      <Screen
        gap={12}
        header={
          <SpaceHeader space="portfolio" {...header} onNotifications={menu.toggle}>
            <ResourceView resource={portfolio} emptyLabel="No balances yet">
              {(data) => (
                <HeroMetrics
                  primary={[
                    { label: "Wallet balance", value: formatUsdOrDash(data.walletBalance) },
                    { label: "Margin account", value: formatUsd(data.marginBalance) },
                  ]}
                  secondary={[
                    { label: "Health", value: healthText(data), dot: data.hasMarginAccount && data.health !== null },
                    { label: "Total borrowed", value: formatUsd(data.totalBorrowed) },
                    { label: "Net earnings", value: data.netEarnings === null ? "—" : formatSignedUsd(data.netEarnings), positive: data.netEarnings !== null && data.netEarnings > 0n },
                  ]}
                />
              )}
            </ResourceView>
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
              {data.hasMarginAccount ? null : (
                <EmptyCard
                  title="No margin account yet"
                  message="Create one to borrow, trade with leverage and farm. It holds your collateral."
                  actionLabel="Create margin account"
                  onAction={() => router.push(routes.marginCreate)}
                />
              )}
              {data.positions === null ? null : data.positions.length === 0 ? (
                data.hasMarginAccount ? <EmptyCard title="No open positions" message="Open a long or short in Trade, or deploy into Farm. Positions show up here." /> : null
              ) : (
                <Positions positions={data.positions} />
              )}
              {data.assets === null ? null : <Assets assets={data.assets} />}
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
