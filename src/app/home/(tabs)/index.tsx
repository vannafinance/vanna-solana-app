import { router } from "expo-router";
import { ArrowsLeftRight, HandCoins, Plant, TrendUp } from "phosphor-react-native";
import { View } from "react-native";

import { ExploreTile } from "@/components/home/explore-tile";
import { HeroMetrics } from "@/components/home/hero-metrics";
import { HomeBrand } from "@/components/home/home-brand";
import { OfflineBanner } from "@/components/home/offline-banner";
import { PositionRow } from "@/components/home/position-row";
import { EarnArt, FarmArt, PerpsArt, SwapArt } from "@/components/home/tile-art";
import { EmptyCard } from "@/components/home/empty-card";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ProductHeader } from "@/components/ui/product-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { VannaWordmark } from "@/components/ui/vanna-wordmark";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useHeaderProps } from "@/hooks/use-header-props";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useTheme } from "@/theme/use-theme";

const PREVIEW_POSITIONS = 3;

export default function Overview() {
  const { colors, spacing } = useTheme();
  const header = useHeaderProps();
  const portfolio = usePortfolio();
  const connectivity = useConnectivity();

  return (
    <Screen
      header={
        <ProductHeader product="home" brand={<HomeBrand />} {...header}>
          <ResourceView resource={portfolio} emptyLabel="No balances yet">
            {(data) => (
              <HeroMetrics
                primary={[
                  { label: "Wallet balance", value: formatUsd(data.walletBalance) },
                  { label: "Margin account", value: formatUsd(data.marginBalance) },
                ]}
                secondary={[
                  { label: "Net available", value: formatUsd(data.netAvailable) },
                  { label: "Total borrowed", value: formatUsd(data.totalBorrowed) },
                  { label: "Net earnings", value: formatSignedUsd(data.netEarnings), positive: data.netEarnings > 0n },
                ]}
              />
            )}
          </ResourceView>
        </ProductHeader>
      }
    >
      {connectivity.online ? null : <OfflineBanner staleMinutes={connectivity.staleMinutes} onRetry={connectivity.retry} />}

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm }}>
        <AppText variant="heading">Explore</AppText>
        <VannaWordmark color={colors.text} height={20} />
      </View>
      <View style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: "row", gap: spacing.lg }}>
          <ExploreTile product="perps" title="Perps" tagline="Long or short up to 5x" icon={TrendUp} art={<PerpsArt />} onPress={() => router.push("/perps")} />
          <ExploreTile product="swap" title="Swap" tagline="Any token, in seconds" icon={ArrowsLeftRight} art={<SwapArt />} onPress={() => router.push("/swap")} />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.lg }}>
          <ExploreTile product="earn" title="Earn" tagline="Lend, withdraw anytime" icon={HandCoins} art={<EarnArt />} onPress={() => router.push("/earn")} />
          <ExploreTile product="farm" title="Farm" tagline="Yield in one click" icon={Plant} art={<FarmArt />} onPress={() => router.push("/farm")} />
        </View>
      </View>

      <ResourceView resource={portfolio} emptyLabel="No positions yet">
        {(data) => (
          <View style={{ gap: spacing.lg }}>
            <SectionHeader title="Your positions" actionLabel="See all" onAction={() => router.navigate("/home/trader")} />
            {data.positions.length === 0 ? (
              <EmptyCard
                title="No open positions"
                message="Open a long or short in Perps, or deploy into Farm. Positions show up here."
              />
            ) : (
              <Card style={{ paddingVertical: spacing.xs }}>
                {data.positions.slice(0, PREVIEW_POSITIONS).map((position, index, shown) => (
                  <PositionRow
                    key={position.id}
                    position={position}
                    last={index === shown.length - 1}
                    onPress={() => router.navigate("/home/trader")}
                  />
                ))}
              </Card>
            )}
          </View>
        )}
      </ResourceView>
    </Screen>
  );
}

