import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ExplorerLink } from "@/components/ui/explorer-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatSwapAmount } from "@/format/format-swap-amount";
import { useTheme } from "@/theme/use-theme";
import type { SwapHistoryGroup } from "@/types/swap";

type SwapHistoryRowProps = {
  group: SwapHistoryGroup;
  onOpenTransaction: (signature: string) => void;
};

const ICON_SIZE = 30;

export function SwapHistoryRow({ group, onOpenTransaction }: SwapHistoryRowProps) {
  const { colors } = useTheme();
  const date = new Date(group.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <Card padded={false} style={{ paddingHorizontal: 16 }}>
      <View style={{ height: 40, justifyContent: "center" }}>
        <AppText variant="caption" strong color="textMuted">
          {date}
        </AppText>
      </View>
      {group.entries.map((entry) => {
        const received = `${formatSwapAmount(entry.amountOut.raw, entry.amountOut.decimals, entry.to)} ${entry.to}`;
        const paid = `${formatSwapAmount(entry.amountIn.raw, entry.amountIn.decimals, entry.from)} ${entry.from}`;
        const time = new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return (
          <View
            key={entry.id}
            accessible
            accessibilityLabel={
              entry.failed
                ? `${entry.from} to ${entry.to}, failed${entry.reason ? `, ${entry.reason}` : ""}, tried to swap ${paid}`
                : `${entry.from} to ${entry.to}, received ${received}, paid ${paid}`
            }
            style={{ height: 68, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: colors.divider }}
          >
            <View style={{ flexDirection: "row" }}>
              <View style={{ borderRadius: 999, borderWidth: 2, borderColor: colors.surface }}>
                <TokenIcon symbol={entry.from} size={ICON_SIZE - 4} />
              </View>
              <View style={{ marginLeft: -10, borderRadius: 999, borderWidth: 2, borderColor: colors.surface }}>
                <TokenIcon symbol={entry.to} size={ICON_SIZE - 4} />
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="body" strong numberOfLines={1}>
                {`${entry.from} → ${entry.to}`}
              </AppText>
              <AppText variant="caption" color={entry.failed ? "negative" : "textMuted"} numberOfLines={1}>
                {entry.failed && entry.reason ? `${time} · ${entry.reason}` : time}
              </AppText>
            </View>
            {entry.failed ? (
              // Nothing moved: the badge says so, and the amount is what the swap tried to sell.
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <StatusBadge tone="failed" label="Failed" />
                <AppText variant="caption" color="textMuted">
                  {paid}
                </AppText>
              </View>
            ) : (
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <AppText variant="body" strong>
                  {`+${received}`}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {paid}
                </AppText>
              </View>
            )}
            <ExplorerLink signature={entry.signature} onOpen={onOpenTransaction} />
          </View>
        );
      })}
    </Card>
  );
}
