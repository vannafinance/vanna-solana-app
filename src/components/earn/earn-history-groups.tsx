import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { formatFullAmount, formatSummaryNumber } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { EarnHistoryEntry, EarnHistoryGroup } from "@/types/earn";

import { ActivityRow, type ActivityRowProps } from "./activity-row";

type RowView = Pick<ActivityRowProps, "icon" | "tone" | "title" | "detail" | "value" | "valueSub" | "positive" | "signature" | "failed">;

function rowView(entry: EarnHistoryEntry): RowView {
  const vault = `${entry.asset} vault`;
  switch (entry.kind) {
    case "interest":
      return { icon: "toll", tone: "teal", title: "Interest paid", detail: vault, value: formatSignedUsd(entry.usd), valueSub: entry.when, positive: true };
    case "withdraw":
    case "supply":
      return {
        icon: entry.kind === "supply" ? "arrow_upward" : "arrow_downward",
        tone: "purple",
        title: entry.failed ? `${entry.kind === "supply" ? "Supply" : "Withdrawal"} failed` : entry.kind === "supply" ? "Supplied" : "Withdrew",
        detail: entry.failed && entry.reason ? `${vault} · ${entry.reason}` : vault,
        value: entry.amount === null ? "—" : formatFullAmount(entry.amount, entry.asset),
        valueSub: entry.usd === null ? undefined : formatUsd(entry.usd),
        signature: entry.signature,
        failed: entry.failed,
      };
    case "shares":
      return { icon: "toll", tone: "teal", title: `Received v${entry.asset}`, detail: "Vault shares", value: `${formatSummaryNumber(entry.shares, entry.asset)} v${entry.asset}` };
  }
}

type EarnHistoryGroupsProps = {
  groups: readonly EarnHistoryGroup[];
  onOpenTransaction: (signature: string) => void;
};

// The wallet's Earn activity, one card per day: what happened on the left, the amount lined up on the right.
export function EarnHistoryGroups({ groups, onOpenTransaction }: EarnHistoryGroupsProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.md }}>
      {groups.map((group) => (
        <Card key={group.label} padded={false} style={{ paddingHorizontal: spacing.lg }}>
          <View style={{ height: 40, justifyContent: "center" }}>
            <AppText variant="caption" strong color="textMuted">
              {group.label}
            </AppText>
          </View>
          {group.entries.map((entry) => (
            <ActivityRow key={entry.id} {...rowView(entry)} onOpenTransaction={onOpenTransaction} />
          ))}
        </Card>
      ))}
    </View>
  );
}
