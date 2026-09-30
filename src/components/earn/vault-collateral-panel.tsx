import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { VaultDetail } from "@/types/earn";

import { formatSummaryAmount, formatSummaryNumber } from "./earn-format";
import { EarnUsageBar } from "./earn-usage-bar";

type VaultCollateralPanelProps = {
  vault: VaultDetail;
};

function UsageBlock({ label, usageBps, caption, first }: { label: string; usageBps: number; caption: string; first?: boolean }) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={{
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText variant="bodyLg" color="textMuted">
          {label}
        </AppText>
        <AppText variant="bodyLg" strong>
          {formatPercent(usageBps, 1)}
        </AppText>
      </View>
      <EarnUsageBar fractionBps={usageBps} />
      <AppText variant="label" color="textMuted">
        {caption}
      </AppText>
    </View>
  );
}

export function VaultCollateralPanel({ vault }: VaultCollateralPanelProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <Card style={{ paddingVertical: spacing.xs }}>
        <UsageBlock
          first
          label="Supply cap usage"
          usageBps={vault.supplyCapUsageBps}
          caption={`${formatSummaryNumber(vault.supplied, vault.symbol)} ${vault.symbol} of ${formatSummaryAmount(vault.supplyCap, vault.symbol)}`}
        />
        <UsageBlock
          label="Borrow cap usage"
          usageBps={vault.borrowCapUsageBps}
          caption={`${formatSummaryNumber(vault.borrowed, vault.symbol)} ${vault.symbol} of ${formatSummaryAmount(vault.borrowCap, vault.symbol)}`}
        />
      </Card>
      <AppText strong style={{ marginTop: spacing.md }}>
        Assets and limits
      </AppText>
      <Card>
        <AppText variant="body" color="textMuted">
          Every asset below is uncapped per margin account
        </AppText>
        {vault.collateralAssets.map((asset) => (
          <View
            key={asset.symbol}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              minHeight: 60,
              marginTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.divider,
            }}
          >
            <TokenIcon symbol={asset.symbol} size={28} />
            <AppText strong style={{ flex: 1 }}>
              {asset.symbol}
            </AppText>
            {asset.collateral ? <Pill tone="teal" label="Collateral" /> : null}
            {asset.borrow ? <Pill tone="purple" label="Borrow" /> : null}
            <AppText variant="caption" color="textMuted" style={{ width: 56, textAlign: "right" }}>
              {`${formatPercent(asset.liquidationBonusBps, asset.liquidationBonusBps % 100 === 0 ? 0 : 1)} bonus`}
            </AppText>
          </View>
        ))}
      </Card>
    </View>
  );
}
