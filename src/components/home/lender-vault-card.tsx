import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatSignedUsd, formatToken, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { LenderVault } from "@/types/portfolio";

import { StatPanel } from "./stat-panel";

type LenderVaultCardProps = {
  vault: LenderVault;
  onWithdraw: () => void;
  onSupplyMore: () => void;
};

function suppliedText(vault: LenderVault) {
  return `${formatToken(vault.supplied, 2).replace(/\.00$/, "")} ${vault.symbol}`;
}

export function LenderVaultCard({ vault, onWithdraw, onSupplyMore }: LenderVaultCardProps) {
  const { colors, radius, spacing } = useTheme();
  const apy = formatPercent(vault.supplyApyBps);

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <TokenIcon symbol={vault.symbol} size={40} />
        <View style={{ flex: 1 }}>
          <AppText variant="title">{vault.name}</AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.positive }} />
            <AppText variant="body" color="textMuted">{`Active · earning ${apy} APY`}</AppText>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <AppText variant="title">{formatUsd(vault.value)}</AppText>
          <AppText variant="body" color="textMuted">
            {suppliedText(vault)}
          </AppText>
        </View>
      </View>
      <StatPanel
        stats={[
          { label: "Supplied", value: suppliedText(vault) },
          { label: "Supply APY", value: apy },
          { label: "Earned", value: formatSignedUsd(vault.earned), color: "positive" },
        ]}
      />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Button flex size="md" variant="outline" label="Withdraw" onPress={onWithdraw} />
        <Button flex size="md" variant="dark" label="Supply more" onPress={onSupplyMore} />
      </View>
    </Card>
  );
}
