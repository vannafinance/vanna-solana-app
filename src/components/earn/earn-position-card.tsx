import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export function EarnPositionCard({ position, onWithdraw, onSupplyMore }: EarnPositionCardProps) {
  const { colors } = useTheme();
  const stats = [
    { label: "Supplied", value: formatSummaryAmount(position.supplied, position.symbol), color: "text" },
    { label: "Supply APY", value: formatPercent(position.supplyApyBps), color: "text" },
    { label: "Earned", value: position.earnedUsd === null ? "—" : formatSignedUsd(position.earnedUsd), color: position.earnedUsd === null ? "text" : "positive" },
  ] as const;

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TokenIcon symbol={position.symbol} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyLg" strong style={{ lineHeight: 20 }}>{`${position.symbol} vault`}</AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.positive }} />
            <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
              Active
            </AppText>
          </View>
        </View>
        <AppText variant="bodyLg" strong style={{ lineHeight: 20 }}>
          {formatUsd(position.valueUsd)}
        </AppText>
      </View>
      <View style={{ marginTop: 16, padding: 12, flexDirection: "row", gap: 8, borderRadius: 12, backgroundColor: colors.background }}>
        {stats.map((stat) => (
          <View key={stat.label} style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
              {stat.label}
            </AppText>
            <AppText variant="body" strong color={stat.color} style={{ lineHeight: 20 }}>
              {stat.value}
            </AppText>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 16, flexDirection: "row", gap: 8 }}>
        <Button label="Withdraw" variant="outline" size="sm" flex onPress={onWithdraw} />
        <Button label="Supply more" variant="dark" size="sm" flex onPress={onSupplyMore} />
      </View>
    </Card>
  );
}
