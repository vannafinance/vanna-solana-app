import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatStrip } from "@/components/ui/stat-strip";
import { StatusBadge } from "@/components/ui/status-badge";
import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";
import type { FarmHistoryEntry, FarmHistoryEvent, FarmHistoryKind } from "@/types/farm";

import { formatAssetAmount, formatTimestamp, pairLabel, shortSignature } from "./farm-format";

type FarmHistoryCardProps = {
  entry: FarmHistoryEntry;
  onOpenTransaction: () => void;
};

const EVENT_TITLE: Record<FarmHistoryEvent, string> = { deploy: "Deploy", exit: "Exit Kamino", return: "Return stock" };

const ACTION_LABEL: Record<FarmHistoryKind, string> = { deposit: "Deposit", borrow: "Borrow", supply: "Supply", redeem: "Redeem", repay: "Repay", withdraw: "Withdraw" };

// One Farm transaction: what it was, whether it went through, what it moved, and its transaction. A failed one is marked
// with a red badge, its amounts are greyed out because nothing moved, and the reason is given when the chain says.
export function FarmHistoryCard({ entry, onOpenTransaction }: FarmHistoryCardProps) {
  const { colors, spacing } = useTheme();
  const failed = entry.status === "failed";
  const signature = shortSignature(entry.signature);
  const title = EVENT_TITLE[entry.event];

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <View
          accessible
          accessibilityLabel={`${title}, ${pairLabel(entry.collateralSymbol, entry.poolSymbol)}, ${failed ? "failed" : "succeeded"}`}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
        >
          <View style={{ opacity: failed ? 0.5 : 1 }}>
            <TokenIcon symbol={entry.collateralSymbol} size={40} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyLg" strong numberOfLines={1}>
              {title}
            </AppText>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {pairLabel(entry.collateralSymbol, entry.poolSymbol)}
            </AppText>
          </View>
          <StatusBadge tone={failed ? "failed" : "success"} label={failed ? "Failed" : "Succeeded"} />
        </View>

        <StatStrip
          stats={entry.actions.map((action) => ({
            label: ACTION_LABEL[action.kind],
            value: formatAssetAmount(action.amount, action.symbol),
            sub: action.symbol,
            valueColor: failed ? "textMuted" : "text",
          }))}
        />

        {failed && entry.reason !== null ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, minHeight: 24 }}>
            <AppText variant="body" color="textMuted">
              Reason
            </AppText>
            <AppText variant="body" strong color="negative" numberOfLines={1} style={{ flexShrink: 1, textAlign: "right" }}>
              {entry.reason}
            </AppText>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider }}>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {formatTimestamp(entry.occurredAt)}
          </AppText>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open transaction ${signature} in explorer`}
            onPress={onOpenTransaction}
            style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: spacing.md }}
          >
            <AppText variant="caption" strong color="link">
              {signature}
            </AppText>
            <Icon name="arrow_outward" size={14} color="link" />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}
