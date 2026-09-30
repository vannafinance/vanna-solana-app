import { CaretDown, CaretUp } from "phosphor-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { DetailRow } from "@/components/ui/detail-row";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatSignedPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import type { ClosedSummary } from "@/types/perps";
import { useTheme } from "@/theme/use-theme";

import { formatTokenSize, sideLabel } from "./format-perps";
import { ListScreen } from "./list-screen";

type PerpsHistoryListProps = {
  header: ReactNode;
  closed: readonly ClosedSummary[];
  realizedPnl: bigint;
  winRateBps: number;
  empty: ReactNode;
};

export function PerpsHistoryList({ header, closed, realizedPnl, winRateBps, empty }: PerpsHistoryListProps) {
  const { colors, radius, spacing } = useTheme();
  const [openId, setOpenId] = useState<string | null>(null);

  const stats = (
    <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderBottomLeftRadius: closed.length === 0 ? radius.lg : 0, borderBottomRightRadius: closed.length === 0 ? radius.lg : 0 }}>
      <View style={{ flexDirection: "row", minHeight: 72, alignItems: "center" }}>
        <Stat label="Realized PnL" value={formatSignedUsd(realizedPnl)} color={realizedPnl >= 0n ? "positive" : "negative"} first />
        <Stat label="Closed" value={String(closed.length)} />
        <Stat label="Win rate" value={formatPercent(winRateBps, 0)} />
      </View>
    </View>
  );

  return (
    <ListScreen
      data={closed}
      keyOf={(entry) => entry.id}
      itemGap={0}
      header={
        <>
          {header}
          {stats}
        </>
      }
      empty={empty}
      footer={
        closed.length === 0 ? null : (
          <View style={{ marginTop: -spacing.lg, minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg }}>
            <AppText variant="caption" color="textMuted">
              Showing the last 30 days
            </AppText>
          </View>
        )
      }
      renderItem={(entry) => (
        <HistoryRow entry={entry} open={entry.id === openId} onToggle={() => setOpenId(entry.id === openId ? null : entry.id)} />
      )}
    />
  );
}

type StatProps = { label: string; value: string; color?: "positive" | "negative"; first?: boolean };

function Stat({ label, value, color = undefined, first = false }: StatProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flex: 1, gap: 2, paddingLeft: first ? 0 : spacing.lg, borderLeftWidth: first ? 0 : 1, borderLeftColor: colors.divider }}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="bodyLg" strong color={color}>
        {value}
      </AppText>
    </View>
  );
}

type HistoryRowProps = { entry: ClosedSummary; open: boolean; onToggle: () => void };

function HistoryRow({ entry, open, onToggle }: HistoryRowProps) {
  const { colors, radius, spacing } = useTheme();
  const tone = entry.pnl >= 0n ? "positive" : "negative";
  const Caret = open ? CaretUp : CaretDown;

  return (
    <View style={{ paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${entry.pair} ${sideLabel(entry.side)} ${entry.leverage}x, ${formatSignedUsd(entry.pnl)}`}
        onPress={onToggle}
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 72 }}
      >
        <TokenIcon symbol={entry.symbol} size={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" strong>
            {entry.pair}
          </AppText>
          <AppText variant="caption" color="textMuted">
            <AppText variant="caption" strong color={entry.side === "long" ? "link" : "negative"}>
              {`${sideLabel(entry.side)} ${entry.leverage}x`}
            </AppText>
            {` · ${entry.openedOn} · ${entry.heldFor}`}
          </AppText>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <AppText variant="body" strong color={tone}>
            {formatSignedUsd(entry.pnl)}
          </AppText>
          <AppText variant="caption" color={tone}>
            {formatSignedPercent(entry.pnlBps)}
          </AppText>
        </View>
        <Caret size={16} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <View style={{ marginLeft: 48, marginBottom: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.background }}>
          <DetailRow label="Entry → exit" value={`${formatUsd(entry.entryPrice)} → ${formatUsd(entry.exitPrice)}`} />
          <DetailRow label="Size" value={formatTokenSize(entry.tokens, entry.symbol)} />
          <DetailRow label="Collateral" value={formatUsd(entry.collateral)} />
          <DetailRow label="Fees paid" value={formatUsd(entry.fees)} last />
        </View>
      ) : null}
    </View>
  );
}
