import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatStrip } from "@/components/ui/stat-strip";
import { StatusBadge } from "@/components/ui/status-badge";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatSignedUsd, formatToken, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { LenderVault } from "@/types/portfolio";

type LenderVaultCardProps = {
  vault: LenderVault;
  onWithdraw: () => void;
  onSupplyMore: () => void;
};

// One vault the user supplies to: title row (token, vault name, status; value over interest earned, as every Portfolio row
// puts a value over its gain), then what is supplied and at what APY, then actions. The supplied amount keeps its symbol, so it
// gets a half-width column.
export function LenderVaultCard({ vault, onWithdraw, onSupplyMore }: LenderVaultCardProps) {
  const { spacing } = useTheme();
  const earned = vault.earned;

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <TokenIcon symbol={vault.symbol} size={40} />
        <View style={{ flex: 1, alignItems: "flex-start", gap: 4 }}>
          <AppText variant="bodyLg" strong numberOfLines={1} style={{ lineHeight: 20 }}>
            {vault.name}
          </AppText>
          <StatusBadge tone="success" label="Active" />
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <AppText variant="bodyLg" strong numberOfLines={1} style={{ lineHeight: 20 }}>
            {formatUsd(vault.value)}
          </AppText>
          <AppText variant="caption" strong color={earned !== null && earned > 0n ? "positive" : "textMuted"} numberOfLines={1}>
            {earned === null ? "Earnings unavailable" : `${formatSignedUsd(earned)} earned`}
          </AppText>
        </View>
      </View>
      <View style={{ marginTop: spacing.md }}>
        <StatStrip
          stats={[
            { label: "Supplied", value: `${formatToken(vault.supplied, 2).replace(/\.00$/, "")} ${vault.symbol}` },
            { label: "Supply APY", value: formatPercent(vault.supplyApyBps) },
          ]}
        />
      </View>
      <View style={{ marginTop: spacing.md, flexDirection: "row", gap: spacing.sm }}>
        <Button flex size="sm" variant="outline" label="Withdraw" onPress={onWithdraw} />
        <Button flex size="sm" variant="dark" label="Supply more" onPress={onSupplyMore} />
      </View>
    </Card>
  );
}
