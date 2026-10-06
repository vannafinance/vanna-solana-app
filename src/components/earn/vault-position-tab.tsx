import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatToken, formatUsd } from "@/format/format-amount";
import { formatEarnedAmount, formatSummaryAmount } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { VaultDetail, VaultPosition } from "@/types/earn";

type VaultPositionTabProps = {
  vault: VaultDetail;
  position: VaultPosition;
};

// The wallet's position in this vault: its value, then what was supplied, the shares held and the interest earned.
export function VaultPositionTab({ vault, position }: VaultPositionTabProps) {
  const { spacing } = useTheme();
  const earned = position.earned;

  return (
    <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <AppText variant="caption" color="textMuted">
          Your position
        </AppText>
        <AppText variant="heading" strong numberOfLines={1}>
          {formatUsd(position.valueUsd)}
        </AppText>
      </View>
      <StatStrip
        stats={[
          { label: "Supplied", value: formatSummaryAmount(position.supplied, vault.symbol) },
          { label: "Shares", value: formatToken(position.shares, 2), sub: vault.shareSymbol },
          earned === null
            ? { label: "Earned", value: "—", sub: "Needs full history" }
            : { label: "Earned", value: `+${formatEarnedAmount(earned, vault.symbol)}`, valueColor: "positive" },
        ]}
      />
    </Card>
  );
}
