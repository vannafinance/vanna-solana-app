import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ExplorerLink } from "@/components/ui/explorer-link";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { formatFullAmount, formatSummaryNumber } from "@/format/format-earn";
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
      return { icon: "arrow_downward", tone: "purple", title: entry.amount === null ? `Withdrew ${entry.asset}` : `Withdrew ${formatFullAmount(entry.amount, entry.asset)}`, detail: `${entry.asset} vault · to wallet`, value: entry.usd === null ? "—" : formatUsd(entry.usd) };
    case "supply":
      return { icon: "arrow_upward", tone: "purple", title: entry.amount === null ? `Supplied ${entry.asset}` : `Supplied ${formatFullAmount(entry.amount, entry.asset)}`, detail: `${entry.asset} vault · from wallet`, value: entry.usd === null ? "—" : formatUsd(entry.usd) };
    case "shares":
      return { icon: "toll", tone: "teal", title: `Received v${entry.asset}`, detail: "Vault shares minted", value: `${formatSummaryNumber(entry.shares, entry.asset)} v${entry.asset}` };
  }
}

function HistoryRow({ entry, onOpenTransaction }: { entry: EarnHistoryEntry; onOpenTransaction: (signature: string) => void }) {
  const { colors } = useTheme();
  const view = rowView(entry);
  const teal = view.tone === "teal";

  return (
    <View style={{ minHeight: 64, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: colors.divider }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: teal ? colors.tealTint : colors.purpleTint }}>
        <Icon name={view.icon} size={18} color={teal ? "onTealTint" : "onPurpleTint"} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" strong numberOfLines={1} style={{ lineHeight: 20 }}>
          {view.title}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ lineHeight: 16 }}>
          {view.detail}
        </AppText>
      </View>
      <AppText variant="body" strong numberOfLines={1} color={view.positive ? "positive" : "text"}>
        {view.value}
      </AppText>
      {"signature" in entry && entry.signature !== undefined ? <ExplorerLink signature={entry.signature} onOpen={onOpenTransaction} /> : null}
    </View>
  );
}

type EarnHistoryGroupsProps = {
  groups: readonly EarnHistoryGroup[];
  onOpenTransaction: (signature: string) => void;
};

export function EarnHistoryGroups({ groups, onOpenTransaction }: EarnHistoryGroupsProps) {
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
            <HistoryRow key={entry.id} entry={entry} onOpenTransaction={onOpenTransaction} />
          ))}
        </Card>
      ))}
    </View>
  );
}
