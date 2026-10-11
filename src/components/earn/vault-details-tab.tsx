import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatPercent } from "@/format/format-amount";
import { formatExchangeRate, formatPrice, formatSummaryAmount } from "@/format/format-earn";
import { shortAddress } from "@/format/short-address";
import { useTheme } from "@/theme/use-theme";
import type { VaultContract, VaultDetail } from "@/types/earn";

import { FactCard, FactRow, SectionTitle } from "./fact-card";

type VaultDetailsTabProps = {
  vault: VaultDetail;
  onCopyAddress: (contract: VaultContract) => void;
};

// The vault's settings: rates and liquidation in a strip, then the oracle, the limits and the contracts as one-line rows.
export function VaultDetailsTab({ vault, onCopyAddress }: VaultDetailsTabProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ marginTop: spacing.md }}>
      <Card>
        <StatStrip
          stats={[
            { label: "Borrow APY", value: formatPercent(vault.borrowApyBps) },
            { label: "Reserve factor", value: formatPercent(vault.reserveFactorBps) },
            { label: "Liquidation bonus", value: formatPercent(vault.liquidationBonusBps) },
            { label: "Liquidated at", value: `Health ≤ ${vault.liquidationHealthFactor}` },
          ]}
        />
      </Card>
      <SectionTitle title="Oracle" marginTop={20} marginBottom={8} />
      <FactCard>
        <FactRow first label="Price" value={formatPrice(vault.priceUsd)} />
        <FactRow label="Source" value={vault.oracleSource} />
        <FactRow label="Max price age" value={`${vault.oracleMaxAgeSeconds}s`} />
      </FactCard>
      <SectionTitle title="Limits" marginTop={20} marginBottom={8} />
      <FactCard>
        <FactRow first label={`1 ${vault.shareSymbol} is worth`} value={`${formatExchangeRate(vault.shareExchangeRate)} ${vault.symbol}`} />
        <FactRow label="Supply cap" value={vault.supplyCap ? formatSummaryAmount(vault.supplyCap, vault.symbol) : "No cap"} />
        {vault.limits.map((limit) => (
          <FactRow key={limit.label} label={limit.label} value={limit.value} />
        ))}
      </FactCard>
      <SectionTitle title="Contracts" marginTop={20} marginBottom={8} />
      <FactCard>
        {vault.contracts.map((contract, index) => (
          <View key={contract.label} style={{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.md, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.divider }}>
            <AppText variant="body" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
              {contract.label}
            </AppText>
            <AppText variant="caption" style={{ fontFamily: "monospace" }}>
              {shortAddress(contract.address)}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Share ${contract.label} address`}
              onPress={() => onCopyAddress(contract)}
              style={{ width: 44, height: 44, marginRight: -spacing.md, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="content_copy" size={16} color="link" />
            </Pressable>
          </View>
        ))}
      </FactCard>
    </View>
  );
}
