import { type ReactNode, useState } from "react";
import { FlatList, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatSignedPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import { formatTokenSize, sideLabel } from "@/format/format-perps";
import { useTheme } from "@/theme/use-theme";
import type { ClosedSummary } from "@/types/perps";

type PerpsHistoryListProps = {
  header: ReactNode;
  closed: readonly ClosedSummary[];
  winRateBps: number;
  onOpenExplorer: () => void;
};

export function PerpsHistoryList({ header, closed, winRateBps, onOpenExplorer }: PerpsHistoryListProps) {
  const { colors, radius } = useTheme();
  const [openId, setOpenId] = useState<string | null>(closed[0]?.id ?? null);

  return (
    <FlatList
      data={closed}
      keyExtractor={(entry) => entry.id}
      ListHeaderComponent={
        <>
          {header}
          <View
            style={{
              marginHorizontal: 16,
              paddingHorizontal: 16,
              paddingTop: 4,
              borderTopLeftRadius: radius.md,
              borderTopRightRadius: radius.md,
              backgroundColor: colors.surface,
            }}
          >
            <View style={{ height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.divider }}>
              <AppText variant="body" color="textMuted">
                Win rate
              </AppText>
              <AppText variant="bodyLg" strong style={{ lineHeight: 24 }}>
                {formatPercent(winRateBps, 0)}
              </AppText>
            </View>
          </View>
        </>
      }
      ListEmptyComponent={
        <View style={{ marginHorizontal: 16, padding: 24, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md, backgroundColor: colors.surface }}>
          <AppText color="textMuted" style={{ textAlign: "center" }}>
            No closed positions yet
          </AppText>
        </View>
      }
      ListFooterComponent={
        closed.length === 0 ? null : (
          <View
            style={{
              height: 52,
              marginHorizontal: 16,
              paddingBottom: 4,
              alignItems: "center",
              justifyContent: "center",
              borderBottomLeftRadius: radius.md,
              borderBottomRightRadius: radius.md,
              backgroundColor: colors.surface,
            }}
          >
            <AppText variant="caption" color="textMuted">
              Showing the last 30 days
            </AppText>
          </View>
        )
      }
      renderItem={({ item }) => (
        <HistoryRow entry={item} open={item.id === openId} onToggle={() => setOpenId(item.id === openId ? null : item.id)} onOpenExplorer={onOpenExplorer} />
      )}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    />
  );
}

type HistoryRowProps = { entry: ClosedSummary; open: boolean; onToggle: () => void; onOpenExplorer: () => void };

function HistoryRow({ entry, open, onToggle, onOpenExplorer }: HistoryRowProps) {
  const { colors, radius } = useTheme();
  const tone = entry.pnl >= 0n ? "positive" : "negative";
  const details = [
    { label: "Entry → exit", value: `${formatUsd(entry.entryPrice)} → ${formatUsd(entry.exitPrice)}` },
    { label: "Size", value: formatTokenSize(entry.tokens, entry.symbol) },
    { label: "Collateral", value: formatUsd(entry.collateral) },
    { label: "Fees paid", value: formatUsd(entry.fees) },
  ];

  return (
    <View style={{ marginHorizontal: 16, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${entry.pair} ${sideLabel(entry.side)} ${entry.leverage}x, ${formatSignedUsd(entry.pnl)}`}
        android_ripple={ripple(colors.text)}
        onPress={onToggle}
        style={{ minHeight: 72, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <TokenIcon symbol={entry.symbol} size={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" strong>
            {entry.pair}
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
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
        <Icon name="keyboard_arrow_down" size={16} color="textMuted" rotate={open ? 180 : undefined} />
      </Pressable>
      {open ? (
        <View style={{ marginLeft: 48, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.background }}>
          {details.map((detail) => (
            <View key={detail.label} style={{ height: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <AppText variant="caption" color="textMuted">
                {detail.label}
              </AppText>
              <AppText variant="caption" strong>
                {detail.value}
              </AppText>
            </View>
          ))}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="View on Solana Explorer"
            onPress={onOpenExplorer}
            style={{ height: 32, flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <AppText variant="caption" strong color="link">
              View on Solana Explorer
            </AppText>
            <Icon name="arrow_outward" size={12} color="link" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
