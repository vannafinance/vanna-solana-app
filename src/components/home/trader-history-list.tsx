import { ArrowUpRight, CaretDown, CaretUp } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { ClosedPosition } from "@/types/portfolio";

import { pnlColor, pnlText, sideColor, sideLabel, tokenText } from "./position-format";

type TraderHistoryListProps = {
  history: readonly ClosedPosition[];
  realizedPnl: bigint;
  winRateBps: number;
  onExplorer: () => void;
};

type HistoryRowProps = {
  position: ClosedPosition;
  open: boolean;
  last: boolean;
  onToggle: () => void;
  onExplorer: () => void;
};

function Summary({ realizedPnl, closed, winRateBps }: { realizedPnl: bigint; closed: number; winRateBps: number }) {
  const { colors, spacing } = useTheme();
  const cells = [
    { label: "Realized PnL", value: formatSignedUsd(realizedPnl), color: pnlColor(realizedPnl) },
    { label: "Closed", value: String(closed), color: "text" as const },
    { label: "Win rate", value: `${Math.round(winRateBps / 100)}%`, color: "text" as const },
  ];

  return (
    <View style={{ flexDirection: "row", paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
      {cells.map((cell, index) => (
        <View
          key={cell.label}
          style={{
            flex: 1,
            paddingLeft: index === 0 ? 0 : spacing.md,
            borderLeftWidth: index === 0 ? 0 : 1,
            borderLeftColor: colors.divider,
          }}
        >
          <AppText variant="body" color="textMuted">
            {cell.label}
          </AppText>
          <AppText variant="title" color={cell.color}>
            {cell.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function HistoryRow({ position, open, last, onToggle, onExplorer }: HistoryRowProps) {
  const { colors, radius, spacing } = useTheme();
  const { amount, percent } = pnlText(position.pnl, position.pnlBps);
  const color = pnlColor(position.pnl);
  const Chevron = open ? CaretUp : CaretDown;
  const label = sideLabel(position.side, position.leverage);

  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.divider }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${position.pair}, ${label}, ${amount}`}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 72 }}
      >
        <TokenIcon symbol={position.symbol} size={36} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyLg" strong>
            {position.pair}
          </AppText>
          <AppText variant="body" color="textMuted">
            <AppText variant="body" strong color={sideColor(position.side)}>
              {label}
            </AppText>
            {` · ${position.closedOn} · ${position.duration}`}
          </AppText>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <AppText variant="bodyLg" strong color={color}>
            {amount}
          </AppText>
          <AppText variant="body" color={color}>
            {percent}
          </AppText>
        </View>
        <Chevron size={18} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <View style={{ marginLeft: 36 + spacing.md, marginBottom: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.background }}>
          {position.entryPrice !== undefined && position.exitPrice !== undefined ? (
            <DetailRow label="Entry → exit" value={`${formatUsd(position.entryPrice)} → ${formatUsd(position.exitPrice)}`} />
          ) : null}
          <DetailRow label="Size" value={tokenText(position.sizeTokens, position.symbol)} />
          <DetailRow label="Collateral" value={formatUsd(position.collateral)} />
          <DetailRow label="Fees paid" value={formatUsd(position.fees)} last />
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="View on Solana Explorer"
            onPress={onExplorer}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 }}
          >
            <AppText variant="bodyLg" strong color="link">
              View on Solana Explorer
            </AppText>
            <ArrowUpRight size={16} color={colors.link} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function TraderHistoryList({ history, realizedPnl, winRateBps, onExplorer }: TraderHistoryListProps) {
  const [openId, setOpenId] = useState<string | null>(history[0]?.id ?? null);

  return (
    <Card>
      <Summary realizedPnl={realizedPnl} closed={history.length} winRateBps={winRateBps} />
      {history.map((position, index) => (
        <HistoryRow
          key={position.id}
          position={position}
          open={openId === position.id}
          last={index === history.length - 1}
          onToggle={() => setOpenId((current) => (current === position.id ? null : position.id))}
          onExplorer={onExplorer}
        />
      ))}
    </Card>
  );
}
