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
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { assetDetail, changeToday } from "@/format/format-asset";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useNotificationMenu } from "@/hooks/use-notification-menu";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useTheme } from "@/theme/use-theme";
import type { Portfolio } from "@/types/portfolio";

const PREVIEW_POSITIONS = 3;

function Positions({ data }: { data: Portfolio }) {
  const { spacing } = useTheme();
  const shown = data.positions.slice(0, PREVIEW_POSITIONS);

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

function Assets({ data }: { data: Portfolio }) {
  const { spacing } = useTheme();

  return (
    <>
      <View style={{ marginTop: spacing.xs }}>
        <SectionHeader title="Your assets" />
      </View>
      <Card padded={false} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
        {data.assets.map((asset, index) => (
          <AssetRow
            key={asset.symbol}
            symbol={asset.symbol}
            detail={assetDetail(asset.symbol, asset.tokens, asset.value)}
            value={formatUsd(asset.value)}
            change={changeToday(asset.changeTodayBps)}
            changeBps={asset.changeTodayBps}
            first={index === 0}
          />
        ))}
      </Card>
    </>
  );
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
                    { label: "Wallet balance", value: formatUsd(data.walletBalance) },
                    { label: "Margin account", value: formatUsd(data.marginBalance) },
                  ]}
                  secondary={[
                    { label: "Health", value: data.health === null ? "No debt" : `${data.health.toFixed(2)} · ${healthLabel(data.health)}`, dot: data.health !== null },
                    { label: "Total borrowed", value: formatUsd(data.totalBorrowed) },
                    { label: "Net earnings", value: formatSignedUsd(data.netEarnings), positive: data.netEarnings > 0n },
                  ]}
                />
              )}
            </ResourceView>
          </SpaceHeader>
        }
      >
        {connectivity.online ? null : <OfflineBanner staleMinutes={connectivity.staleMinutes} onRetry={connectivity.retry} />}

        <ResourceView resource={portfolio} emptyLabel="No positions yet">
          {(data) =>
            data.positions.length === 0 ? (
              <>
                <Assets data={data} />
                <EmptyCard title="No open positions" message="Open a long or short in Trade, or deploy into Farm. Positions show up here." />
              </>
            ) : (
              <>
                <Positions data={data} />
                <Assets data={data} />
              </>
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
