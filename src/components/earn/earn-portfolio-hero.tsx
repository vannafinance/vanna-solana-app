import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { HeroStat } from "@/components/ui/hero-stat";
import { Money } from "@/components/ui/money";
import { formatPercent, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { EarnPortfolioSummary } from "@/types/earn";

type EarnPortfolioHeroProps = {
  summary: EarnPortfolioSummary;
};

export function EarnPortfolioHero({ summary }: EarnPortfolioHeroProps) {
  const { colors, spacing } = useTheme();
  const divided = { paddingLeft: spacing.md, borderLeftWidth: 1, borderLeftColor: colors.heroDivider } as const;

  return (
    <View style={{ marginTop: spacing.xl }}>
      <AppText color="onHeroMuted">Your supplied assets</AppText>
      <Money value={formatUsd(summary.suppliedUsd)} color="onHero" />
      <View
        style={{
          flexDirection: "row",
          gap: spacing.md,
          marginTop: spacing.lg,
          paddingTop: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.heroDivider,
        }}
      >
        <View style={{ flex: 1 }}>
          <HeroStat label="Total holdings" value={formatUsd(summary.totalHoldingsUsd)} />
        </View>
        <View style={[{ flex: 1 }, divided]}>
          <HeroStat label="Supplied" value={`${summary.assetCount} ${summary.assetCount === 1 ? "asset" : "assets"}`} />
        </View>
        <View style={[{ flex: 1 }, divided]}>
          <HeroStat label="Avg supply APY" value={formatPercent(summary.averageSupplyApyBps)} />
        </View>
      </View>
    </View>
  );
}
