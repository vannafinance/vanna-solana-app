import type { ReactNode } from "react";
import { FlatList, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ripple } from "@/components/ui/ripple";
import { isTokenSymbol, TokenIcon } from "@/components/ui/token-icon";
import { formatDateTime } from "@/format/format-date";
import { formatActivityAmount } from "@/format/format-perps";
import { shortAddress } from "@/format/short-address";
import { type ThemeColor, useTheme } from "@/theme/use-theme";
import type { HistoryChip, MarginActivity } from "@/types/margin-history";

type ActivityListProps = {
  header: ReactNode;
  entries: readonly MarginActivity[];
  emptyLabel: string;
  onOpenTransaction: (signature: string) => void;
};

const CHIP_TONE: Record<HistoryChip["type"], ThemeColor> = {
  deposit: "positive",
  borrow: "warning",
  swap: "link",
  repay: "link",
  withdraw: "textMuted",
};

function chipText(chip: HistoryChip): string {
  if (chip.type === "swap") return `${formatActivityAmount(chip.from.amount)} ${chip.from.asset} → ${formatActivityAmount(chip.to.amount)} ${chip.to.asset}`;
  return `${formatActivityAmount(chip.leg.amount)} ${chip.leg.asset}`;
}

function Chip({ chip }: { chip: HistoryChip }) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${chip.type} ${chipText(chip)}`}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.chip, backgroundColor: colors.background }}
    >
      <AppText variant="caption" strong color={CHIP_TONE[chip.type]}>
        {chip.type.toUpperCase()}
      </AppText>
      <AppText variant="caption" strong>
        {chipText(chip)}
      </AppText>
    </View>
  );
}

function Entry({ entry, onOpenTransaction }: { entry: MarginActivity; onOpenTransaction: (signature: string) => void }) {
  const { colors, radius, spacing } = useTheme();
  const symbol = entry.stock !== null && isTokenSymbol(entry.stock) ? entry.stock : "USDC";

  return (
    <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <TokenIcon symbol={symbol} size={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" strong numberOfLines={1}>
            {entry.title ?? "Margin account"}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {formatDateTime(entry.at)}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`View transaction ${shortAddress(entry.signature)}`}
          android_ripple={ripple(colors.link)}
          hitSlop={8}
          onPress={() => onOpenTransaction(entry.signature)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <AppText variant="caption" strong color="link">
            {shortAddress(entry.signature)}
          </AppText>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {entry.chips.map((chip, index) => (
          <Chip key={`${chip.type}-${index}`} chip={chip} />
        ))}
      </View>
    </View>
  );
}

export function ActivityList({ header, entries, emptyLabel, onOpenTransaction }: ActivityListProps) {
  const { colors, spacing } = useTheme();

  return (
    <FlatList
      data={entries}
      keyExtractor={(entry) => entry.signature}
      ListHeaderComponent={<>{header}</>}
      ListEmptyComponent={
        <AppText color="textMuted" style={{ textAlign: "center", padding: spacing.xl }}>
          {emptyLabel}
        </AppText>
      }
      renderItem={({ item }) => <Entry entry={item} onOpenTransaction={onOpenTransaction} />}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
    />
  );
}
