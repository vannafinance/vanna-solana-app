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

export function LenderVaultCard({ vault, onWithdraw, onSupplyMore }: LenderVaultCardProps) {
  const { colors, spacing } = useTheme();

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <TokenIcon symbol={vault.symbol} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyLg" strong style={{ lineHeight: 20 }}>
            {vault.name}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.positive }} />
            <AppText variant="caption" color="textMuted">
              Active
            </AppText>
          </View>
        </View>
        <AppText variant="bodyLg" strong style={{ lineHeight: 20 }}>
          {formatUsd(vault.value)}
        </AppText>
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <StatPanel
          stats={[
            { label: "Supplied", value: `${formatToken(vault.supplied, 2).replace(/\.00$/, "")} ${vault.symbol}` },
            { label: "Supply APY", value: formatPercent(vault.supplyApyBps) },
            { label: "Earned", value: formatSignedUsd(vault.earned), color: "positive" },
          ]}
        />
      </View>
      <View style={{ marginTop: spacing.lg, flexDirection: "row", gap: spacing.sm }}>
        <Button flex size="sm" variant="outline" label="Withdraw" onPress={onWithdraw} />
        <Button flex size="sm" variant="dark" label="Supply more" onPress={onSupplyMore} />
      </View>
    </Card>
  );
}
