import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Money } from "@/components/ui/money";
import { formatPercent, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { EarnPortfolioSummary } from "@/types/earn";

type EarnPortfolioPanelProps = {
  summary: EarnPortfolioSummary;
};

export function EarnPortfolioPanel({ summary }: EarnPortfolioPanelProps) {
  const { colors } = useTheme();
  const stats = [
    { label: "Total holdings", value: summary.totalHoldingsUsd === null ? "—" : formatUsd(summary.totalHoldingsUsd) },
    { label: "Supplied", value: `${summary.assetCount} ${summary.assetCount === 1 ? "asset" : "assets"}` },
    { label: "Avg supply APY", value: formatPercent(summary.averageSupplyApyBps) },
  ];

  return (
    <View>
      <AppText variant="body" style={{ lineHeight: 20, color: colors.onHeroSoft }}>
        Your supplied assets
      </AppText>
      <Money value={formatUsd(summary.suppliedUsd)} color="onHero" style={{ marginTop: 2, fontSize: 40, lineHeight: 48, letterSpacing: -0.8 }} />
      <View style={{ marginTop: 20, paddingTop: 16, flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.heroRule }}>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              gap: 2,
              marginLeft: index === 0 ? 0 : 12,
              paddingLeft: index === 0 ? 0 : 12,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: colors.heroRuleSoft,
            }}
          >
            <AppText variant="caption" style={{ lineHeight: 16, color: colors.onHeroMuted }}>
              {stat.label}
            </AppText>
            <AppText variant="bodyLg" strong style={{ lineHeight: 22, color: colors.onHero }}>
              {stat.value}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
