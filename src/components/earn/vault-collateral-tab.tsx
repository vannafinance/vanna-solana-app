import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon } from "@/components/ui/token-icon";
import { type TokenAmount, formatPercent } from "@/format/format-amount";
import { formatBonus, formatSummaryAmount } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { EarnAsset, VaultDetail } from "@/types/earn";

import { FactCard, SectionTitle } from "./fact-card";

type CapUsageProps = {
  label: string;
  usageBps: number;
  used: TokenAmount;
  cap: TokenAmount;
  symbol: EarnAsset;
  first?: boolean;
};

function CapUsage({ label, usageBps, used, cap, symbol, first = false }: CapUsageProps) {
  const { colors } = useTheme();

  return (
    <View style={{ paddingVertical: 14, borderTopWidth: first ? 0 : 1, borderTopColor: colors.divider }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText variant="body" color="textMuted">
          {label}
        </AppText>
        <AppText variant="body" strong>
          {formatPercent(usageBps, 1)}
        </AppText>
      </View>
      <View style={{ marginTop: 8, height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: colors.divider }}>
        <View style={{ width: `${Math.min(usageBps / 100, 100)}%`, minWidth: 6, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
      </View>
      <AppText variant="caption" color="textMuted" style={{ marginTop: 6 }}>
        {`${formatSummaryAmount(used, symbol)} of ${formatSummaryAmount(cap, symbol)}`}
      </AppText>
    </View>
  );
}

export function VaultCollateralTab({ vault }: { vault: VaultDetail }) {
  const { colors } = useTheme();

  return (
    <View style={{ marginTop: 12 }}>
      <FactCard>
        <CapUsage first label="Supply cap usage" usageBps={vault.supplyCapUsageBps} used={vault.supplied} cap={vault.supplyCap} symbol={vault.symbol} />
        <CapUsage label="Borrow cap usage" usageBps={vault.borrowCapUsageBps} used={vault.borrowed} cap={vault.borrowCap} symbol={vault.symbol} />
      </FactCard>
      <SectionTitle title="Assets and limits" marginTop={20} marginBottom={6} />
      <FactCard>
        <View style={{ minHeight: 36, paddingVertical: 8, justifyContent: "center" }}>
          <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
            Every asset below works as collateral and can be borrowed, uncapped per margin account
          </AppText>
        </View>
        {vault.collateralAssets.map((asset) => (
          <View key={asset.symbol} style={{ height: 60, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: colors.divider }}>
            <TokenIcon symbol={asset.symbol} size={28} />
            <AppText variant="body" strong style={{ flex: 1 }}>
              {asset.symbol}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {formatBonus(asset.liquidationBonusBps)}
            </AppText>
          </View>
        ))}
      </FactCard>
    </View>
  );
}
