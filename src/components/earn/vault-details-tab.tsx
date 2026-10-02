import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
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

export function VaultDetailsTab({ vault, onCopyAddress }: VaultDetailsTabProps) {
  const { colors } = useTheme();

  return (
    <View style={{ marginTop: 12 }}>
      <FactCard>
        <FactRow first label="Borrow APY" value={formatPercent(vault.borrowApyBps)} />
        <FactRow label="Liquidation bonus" value={formatPercent(vault.liquidationBonusBps)} detail={`Liquidatable at HF ≤ ${vault.liquidationHealthFactor}`} />
        <FactRow label="Oracle price" value={formatPrice(vault.priceUsd)} detail={`${vault.oracleSource} · max age ${vault.oracleMaxAgeSeconds}s`} />
        <FactRow label="Share token exchange rate" value={formatExchangeRate(vault.shareExchangeRate)} detail={`${vault.symbol} per ${vault.shareSymbol}`} />
        <FactRow label="Reserve factor" value={formatPercent(vault.reserveFactorBps)} />
        <FactRow label="Supply cap" value={vault.supplyCap ? formatSummaryAmount(vault.supplyCap, vault.symbol) : "No cap"} />
        {vault.limits.map((limit) => (
          <FactRow key={limit.label} label={limit.label} value={limit.value} />
        ))}
      </FactCard>
      <SectionTitle title="Contracts" marginTop={20} marginBottom={6} />
      <FactCard>
        {vault.contracts.map((contract, index) => (
          <View key={contract.label} style={{ height: 52, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.divider }}>
            <AppText variant="body" color="textMuted" style={{ flex: 1 }}>
              {contract.label}
            </AppText>
            <AppText variant="caption" style={{ fontFamily: "monospace" }}>
              {shortAddress(contract.address)}
            </AppText>
            <Pressable accessibilityRole="button" accessibilityLabel={`Share ${contract.label} address`} hitSlop={14} onPress={() => onCopyAddress(contract)}>
              <Icon name="content_copy" size={16} color="link" />
            </Pressable>
          </View>
        ))}
      </FactCard>
    </View>
  );
}
