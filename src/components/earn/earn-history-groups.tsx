import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { formatSummaryAmount, formatSummaryNumber } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { EarnHistoryEntry, EarnHistoryGroup } from "@/types/earn";

type RowView = {
  icon: IconName;
  tone: "teal" | "purple";
  title: string;
  detail: string;
  value: string;
  positive?: boolean;
};

function rowView(entry: EarnHistoryEntry): RowView {
  switch (entry.kind) {
    case "interest":
      return { icon: "toll", tone: "teal", title: "Interest paid", detail: `${entry.asset} vault · ${entry.when}`, value: formatSignedUsd(entry.usd), positive: true };
    case "withdraw":
      return { icon: "arrow_downward", tone: "purple", title: `Withdrew ${formatSummaryAmount(entry.amount, entry.asset)}`, detail: `${entry.asset} vault · to wallet`, value: formatUsd(entry.usd) };
    case "supply":
      return { icon: "arrow_upward", tone: "purple", title: `Supplied ${formatSummaryAmount(entry.amount, entry.asset)}`, detail: `${entry.asset} vault · from wallet`, value: formatUsd(entry.usd) };
    case "shares":
      return { icon: "toll", tone: "teal", title: `Received v${entry.asset}`, detail: "Vault shares minted", value: `${formatSummaryNumber(entry.shares, entry.asset)} v${entry.asset}` };
  }
}

function HistoryRow({ entry }: { entry: EarnHistoryEntry }) {
  const { colors } = useTheme();
  const view = rowView(entry);
  const teal = view.tone === "teal";

  return (
    <View style={{ height: 64, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: colors.divider }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: teal ? colors.tealTint : colors.purpleTint }}>
        <Icon name={view.icon} size={18} color={teal ? "onTealTint" : "onPurpleTint"} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" strong style={{ lineHeight: 20 }}>
          {view.title}
        </AppText>
        <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
          {view.detail}
        </AppText>
      </View>
      <AppText variant="body" strong color={view.positive ? "positive" : "text"}>
        {view.value}
      </AppText>
    </View>
  );
}

type EarnHistoryGroupsProps = {
  groups: readonly EarnHistoryGroup[];
};

export function EarnHistoryGroups({ groups }: EarnHistoryGroupsProps) {
  return (
    <View style={{ gap: 12 }}>
      {groups.map((group) => (
        <Card key={group.label} padded={false} style={{ paddingHorizontal: 16 }}>
          <View style={{ height: 40, justifyContent: "center" }}>
            <AppText variant="caption" strong color="textMuted">
              {group.label}
            </AppText>
          </View>
          {group.entries.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} />
          ))}
        </Card>
      ))}
    </View>
  );
}
