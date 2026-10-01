import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { EarnHistoryEntry, EarnHistoryGroup } from "@/types/earn";

import { EarnEventRow } from "./earn-event-row";
import { formatSummaryAmount, formatSummaryNumber } from "@/format/format-earn";

function rowFor(entry: EarnHistoryEntry) {
  switch (entry.kind) {
    case "interest":
      return <EarnEventRow kind="interest" title="Interest paid" subtitle={`${entry.asset} vault · ${entry.when}`} trailing={formatSignedUsd(entry.usd)} positive />;
    case "withdraw":
      return <EarnEventRow kind="withdraw" title={`Withdrew ${formatSummaryAmount(entry.amount, entry.asset)}`} subtitle={`${entry.asset} vault · to wallet`} trailing={formatUsd(entry.usd)} />;
    case "supply":
      return <EarnEventRow kind="supply" title={`Supplied ${formatSummaryAmount(entry.amount, entry.asset)}`} subtitle={`${entry.asset} vault · from wallet`} trailing={formatUsd(entry.usd)} />;
    case "shares":
      return <EarnEventRow kind="shares" title={`Received v${entry.asset}`} subtitle="Vault shares minted" trailing={`${formatSummaryNumber(entry.shares, entry.asset)} v${entry.asset}`} />;
  }
}

type EarnHistoryGroupCardProps = {
  group: EarnHistoryGroup;
};

export function EarnHistoryGroupCard({ group }: EarnHistoryGroupCardProps) {
  const { spacing } = useTheme();

  return (
    <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
      <View style={{ height: 40, justifyContent: "center" }}>
        <AppText variant="caption" strong color="textMuted">
          {group.label}
        </AppText>
      </View>
      {group.entries.map((entry) => (
        <View key={entry.id}>{rowFor(entry)}</View>
      ))}
    </Card>
  );
}
