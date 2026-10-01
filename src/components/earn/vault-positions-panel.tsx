import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatSignedUsd, formatToken, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { VaultDetail } from "@/types/earn";

import { EarnEventRow } from "./earn-event-row";
import { formatEarnedAmount, formatFullAmount } from "@/format/format-earn";
import { EarnStatRow } from "./earn-stat-row";

type PositionsView = "current" | "history";

type VaultPositionsPanelProps = {
  vault: VaultDetail;
};

export function VaultPositionsPanel({ vault }: VaultPositionsPanelProps) {
  const { spacing } = useTheme();
  const [view, setView] = useState<PositionsView>("current");
  const position = vault.position;

  return (
    <View style={{ gap: spacing.md }}>
      <SegmentedControl
        segments={[
          { value: "current", label: "Current" },
          { value: "history", label: "History" },
        ]}
        value={view}
        onChange={setView}
      />
      {!position ? (
        <Card>
          <AppText color="textMuted">{`You have not supplied to the ${vault.symbol} vault yet.`}</AppText>
        </Card>
      ) : view === "current" ? (
        <Card style={{ paddingVertical: spacing.xs }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md }}>
            <TokenIcon symbol={vault.symbol} size={36} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyLg" strong>{`${vault.symbol} vault`}</AppText>
              <AppText variant="caption" color="textMuted">{`${formatToken(position.shares, 2)} ${vault.shareSymbol} shares`}</AppText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <AppText variant="bodyLg" strong>
                {formatUsd(position.valueUsd)}
              </AppText>
              <AppText variant="caption" color="positive">{`${formatSignedUsd(position.earnedUsd)} earned`}</AppText>
            </View>
          </View>
          <EarnStatRow label="Current supply APY" value={formatPercent(vault.supplyApyBps)} />
          <EarnStatRow label="Interest earned" value={`+${formatEarnedAmount(position.earned, vault.symbol)}`} valueColor="positive" />
        </Card>
      ) : (
        <Card style={{ paddingVertical: spacing.xs }}>
          {position.events.map((event, index) => (
            <EarnEventRow
              key={event.signature}
              first={index === 0}
              kind={event.kind}
              title={`${event.kind === "supply" ? "Supply" : "Withdraw"} ${formatFullAmount(event.amount, vault.symbol)}`}
              subtitle={`${event.date} · Confirmed · ${event.signature}`}
            />
          ))}
        </Card>
      )}
    </View>
  );
}
