import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ExplorerLink } from "@/components/ui/explorer-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { isTokenSymbol, TokenIcon } from "@/components/ui/token-icon";
import { formatDateTime } from "@/format/format-date";
import { formatActivityAmount } from "@/format/format-perps";
import { type ThemeColor, useTheme } from "@/theme/use-theme";
import type { HistoryChip, MarginActivity } from "@/types/margin-history";

const LEG_LOOK: Record<HistoryChip["type"], { label: string; background: ThemeColor; ink: ThemeColor }> = {
  deposit: { label: "Deposit", background: "tealTint", ink: "onTealTint" },
  borrow: { label: "Borrow", background: "pinkTint", ink: "onPinkTint" },
  swap: { label: "Swap", background: "purpleTint", ink: "onPurpleTint" },
  repay: { label: "Repay", background: "purpleTint", ink: "onPurpleTint" },
  withdraw: { label: "Withdraw", background: "border", ink: "text" },
};

const PILL_WIDTH = 80;

function legAmount(chip: HistoryChip): string {
  if (chip.type === "swap") return `${formatActivityAmount(chip.to.amount)} ${chip.to.asset}`;
  return `${formatActivityAmount(chip.leg.amount)} ${chip.leg.asset}`;
}

// One leg of the transaction as a table row: what happened as a tinted pill, the amount right-aligned. A swap shows what
// came out, with what went in on a small line under it.
function LegRow({ chip, first }: { chip: HistoryChip; first: boolean }) {
  const { colors, radius } = useTheme();
  const look = LEG_LOOK[chip.type];
  const paid = chip.type === "swap" ? `for ${formatActivityAmount(chip.from.amount)} ${chip.from.asset}` : null;

  return (
    <View
      accessible
      accessibilityLabel={`${look.label} ${legAmount(chip)}${paid ? ` ${paid}` : ""}`}
      style={{ minHeight: 44, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: first ? 0 : 1, borderTopColor: colors.divider }}
    >
      <View style={{ width: PILL_WIDTH }}>
        <View style={{ alignSelf: "flex-start", minHeight: 24, paddingVertical: 1, paddingHorizontal: 8, justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors[look.background] }}>
          <AppText variant="caption" strong numberOfLines={1} style={{ color: colors[look.ink] }}>
            {look.label}
          </AppText>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0, alignItems: "flex-end" }}>
        <AppText variant="body" strong numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ textAlign: "right" }}>
          {legAmount(chip)}
        </AppText>
        {paid ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ textAlign: "right" }}>
            {paid}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function ActivityCard({ entry, onOpenTransaction }: { entry: MarginActivity; onOpenTransaction: (signature: string) => void }) {
  const { colors, radius, spacing } = useTheme();
  const symbol = entry.stock !== null && isTokenSymbol(entry.stock) ? entry.stock : "USDC";
  const failed = entry.status === "failed";
  const title = entry.title ?? (failed && entry.chips.length === 0 ? "Transaction failed" : entry.strategy === "farm" ? "Farm position" : "Margin account");

  return (
    <View style={{ padding: spacing.lg, gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <TokenIcon symbol={symbol} size={36} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <AppText variant="body" strong numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" color={failed ? "negative" : "textMuted"} numberOfLines={1}>
            {failed && entry.reason ? `${formatDateTime(entry.at)} · ${entry.reason}` : formatDateTime(entry.at)}
          </AppText>
        </View>
        {/* A failed transaction changed nothing; its legs below are what it tried. */}
        {failed ? <StatusBadge tone="failed" label="Failed" /> : null}
        <ExplorerLink signature={entry.signature} onOpen={onOpenTransaction} />
      </View>
      {entry.chips.length === 0 ? null : (
        <View style={{ borderRadius: radius.sm, backgroundColor: colors.background, paddingHorizontal: spacing.md }}>
          {entry.chips.map((chip, index) => (
            <LegRow key={`${chip.type}-${index}`} chip={chip} first={index === 0} />
          ))}
        </View>
      )}
    </View>
  );
}
