import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { formatCompactUsd, formatPercent, formatUnits } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { VaultDetail } from "@/types/earn";

import { formatSummaryAmount } from "./earn-format";
import { EarnStatRow } from "./earn-stat-row";
import { EarnUsageBar } from "./earn-usage-bar";

const TEN_USD = 10_000_000n;

type VaultDetailsPanelProps = {
  vault: VaultDetail;
};

export function VaultDetailsPanel({ vault }: VaultDetailsPanelProps) {
  const { spacing } = useTheme();
  const priceDigits = vault.priceUsd >= TEN_USD ? 2 : 4;

  return (
    <Card>
      <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText variant="label" color="textMuted">{`Supplied · ${formatCompactUsd(vault.suppliedUsd)}`}</AppText>
          <AppText variant="label" color="textMuted">{`Borrowed · ${formatCompactUsd(vault.borrowedUsd)} (${formatPercent(vault.utilizationBps, 1)})`}</AppText>
        </View>
        <EarnUsageBar fractionBps={vault.utilizationBps} />
      </View>
      <EarnStatRow
        label="Available liquidity"
        value={formatSummaryAmount(vault.availableLiquidity, vault.symbol)}
        caption={formatCompactUsd(vault.suppliedUsd - vault.borrowedUsd)}
      />
      <EarnStatRow label="Supply APY" value={formatPercent(vault.supplyApyBps)} caption={`${formatSummaryAmount(vault.supplied, vault.symbol)} supplied`} />
      <EarnStatRow label="Borrow APY" value={formatPercent(vault.borrowApyBps)} />
      <EarnStatRow label="Utilization rate" value={formatPercent(vault.utilizationBps, 1)} />
      <EarnStatRow
        label="Liquidation bonus"
        value={formatPercent(vault.liquidationBonusBps)}
        caption={`Liquidatable at HF ≤ ${vault.liquidationHealthFactor}`}
      />
      <EarnStatRow
        label="Oracle price"
        value={`$${formatUnits(vault.priceUsd, 6, priceDigits)}`}
        caption={`${vault.oracleSource} · max age ${vault.oracleMaxAgeSeconds}s`}
      />
      <EarnStatRow
        label="Share token exchange rate"
        value={formatUnits(vault.shareExchangeRate, 6, 6)}
        caption={`${vault.symbol} per ${vault.shareSymbol}`}
      />
      <EarnStatRow label="Reserve factor" value={formatPercent(vault.reserveFactorBps)} />
      <EarnStatRow label="Supply cap" value={formatSummaryAmount(vault.supplyCap, vault.symbol)} />
      <AppText strong style={{ marginTop: spacing.lg }}>
        Contracts
      </AppText>
      {vault.contracts.map((contract, index) => (
        <EarnStatRow key={contract.label} first={index === 0} label={contract.label} value={contract.address} />
      ))}
    </Card>
  );
}
