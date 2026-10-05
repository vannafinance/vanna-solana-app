import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ExplorerLink } from "@/components/ui/explorer-link";
import { isTokenSymbol, TokenIcon } from "@/components/ui/token-icon";
import { formatDateTime } from "@/format/format-date";
import { formatActivityAmount } from "@/format/format-perps";
import { type ThemeColor, useTheme } from "@/theme/use-theme";
import type { HistoryChip, MarginActivity } from "@/types/margin-history";

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

export function ActivityCard({ entry, onOpenTransaction }: { entry: MarginActivity; onOpenTransaction: (signature: string) => void }) {
  const { colors, radius, spacing } = useTheme();
  const symbol = entry.stock !== null && isTokenSymbol(entry.stock) ? entry.stock : "USDC";

  return (
    <View style={{ padding: spacing.lg, gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <TokenIcon symbol={symbol} size={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" strong numberOfLines={1}>
            {entry.title ?? (entry.strategy === "farm" ? "Farm position" : "Margin account")}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {formatDateTime(entry.at)}
          </AppText>
        </View>
        <ExplorerLink signature={entry.signature} onOpen={onOpenTransaction} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {entry.chips.map((chip, index) => (
          <Chip key={`${chip.type}-${index}`} chip={chip} />
        ))}
      </View>
    </View>
  );
}
