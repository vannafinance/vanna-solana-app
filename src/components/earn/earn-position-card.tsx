import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { EarnPosition } from "@/types/earn";

import { formatSummaryAmount } from "./earn-format";

type EarnPositionCardProps = {
  position: EarnPosition;
  onWithdraw: () => void;
  onSupplyMore: () => void;
};

function Stat({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText strong color={positive ? "positive" : "text"}>
        {value}
      </AppText>
    </View>
  );
}

export function EarnPositionCard({ position, onWithdraw, onSupplyMore }: EarnPositionCardProps) {
  const { colors, radius, spacing } = useTheme();
  const supplied = formatSummaryAmount(position.supplied, position.symbol);

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <TokenIcon symbol={position.symbol} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyLg" strong>{`${position.symbol} vault`}</AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.positive }} />
            <AppText variant="caption" color="textMuted">{`Active · earning ${formatPercent(position.supplyApyBps)} APY`}</AppText>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <AppText variant="bodyLg" strong>
            {formatUsd(position.valueUsd)}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {supplied}
          </AppText>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: spacing.sm,
          marginTop: spacing.lg,
          padding: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.background,
        }}
      >
        <Stat label="Supplied" value={supplied} />
        <Stat label="Supply APY" value={formatPercent(position.supplyApyBps)} />
        <Stat label="Earned" value={formatSignedUsd(position.earnedUsd)} positive />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
        <Button flex size="md" variant="outline" label="Withdraw" onPress={onWithdraw} />
        <Button flex size="md" variant="dark" label="Supply more" onPress={onSupplyMore} />
      </View>
    </Card>
  );
}
