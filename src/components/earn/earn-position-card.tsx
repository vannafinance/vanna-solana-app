import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatStrip } from "@/components/ui/stat-strip";
import { StatusBadge } from "@/components/ui/status-badge";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import { formatSummaryAmount } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { EarnPosition } from "@/types/earn";

type EarnPositionCardProps = {
  position: EarnPosition;
  onWithdraw: () => void;
  onSupplyMore: () => void;
};

// One supplied vault on the Positions page: name and value, then Supplied, Supply APY and Earned in a strip, then actions.
export function EarnPositionCard({ position, onWithdraw, onSupplyMore }: EarnPositionCardProps) {
  const { spacing } = useTheme();
  const earned = position.earnedUsd;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <TokenIcon symbol={position.symbol} size={40} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="bodyLg" strong numberOfLines={1}>{`${position.symbol} vault`}</AppText>
          <StatusBadge tone="success" label="Active" />
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <AppText variant="bodyLg" strong numberOfLines={1}>
            {formatUsd(position.valueUsd)}
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            Value
          </AppText>
        </View>
      </View>
      <StatStrip
        stats={[
          { label: "Supplied", value: formatSummaryAmount(position.supplied, position.symbol) },
          { label: "Supply APY", value: formatPercent(position.supplyApyBps) },
          { label: "Earned", value: earned === null ? "—" : formatSignedUsd(earned), valueColor: earned !== null && earned > 0n ? "positive" : "text" },
        ]}
      />
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Button label="Withdraw" variant="outline" size="sm" flex onPress={onWithdraw} />
        <Button label="Supply more" variant="dark" size="sm" flex onPress={onSupplyMore} />
      </View>
    </Card>
  );
}
