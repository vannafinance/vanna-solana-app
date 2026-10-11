import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ExplorerLink } from "@/components/ui/explorer-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { LenderActivity, LenderActivityGroup } from "@/types/portfolio";

type LenderHistoryListProps = {
  groups: readonly LenderActivityGroup[];
  onOpenTransaction: (signature: string) => void;
};

const glyphs: Record<LenderActivity["kind"], { icon: IconName; tone: "teal" | "purple" }> = {
  interest: { icon: "toll", tone: "teal" },
  shares: { icon: "toll", tone: "teal" },
  supply: { icon: "arrow_upward", tone: "purple" },
  withdraw: { icon: "arrow_downward", tone: "purple" },
};

function ActivityRow({ activity, onOpenTransaction }: { activity: LenderActivity; onOpenTransaction: (signature: string) => void }) {
  const { colors, radius, spacing } = useTheme();
  const { icon, tone } = glyphs[activity.kind];
  const value = activity.valueLabel ?? (activity.valueUsd === undefined ? "" : activity.gain ? formatSignedUsd(activity.valueUsd) : formatUsd(activity.valueUsd));

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          backgroundColor: tone === "teal" ? colors.tealTint : colors.purpleTint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={18} color={tone === "teal" ? "onTealTint" : "onPurpleTint"} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" strong numberOfLines={1}>
          {activity.title}
        </AppText>
        <AppText variant="caption" color={activity.failed ? "negative" : "textMuted"} numberOfLines={1}>
          {activity.detail}
        </AppText>
      </View>
      {activity.failed ? (
        <StatusBadge tone="failed" label="Failed" />
      ) : (
        <AppText variant="body" strong numberOfLines={1} color={activity.gain ? "positive" : "text"}>
          {value}
        </AppText>
      )}
      {activity.signature === undefined ? null : <ExplorerLink signature={activity.signature} onOpen={onOpenTransaction} />}
    </View>
  );
}

export function LenderHistoryList({ groups, onOpenTransaction }: LenderHistoryListProps) {
  const { spacing } = useTheme();

  return (
    <>
      {groups.map((group) => (
        <Card key={group.label} padded={false} style={{ paddingHorizontal: spacing.lg }}>
          <View style={{ height: 40, justifyContent: "center" }}>
            <AppText variant="caption" strong color="textMuted">
              {group.label}
            </AppText>
          </View>
          {group.items.map((item) => (
            <ActivityRow key={item.id} activity={item} onOpenTransaction={onOpenTransaction} />
          ))}
        </Card>
      ))}
    </>
  );
}
