import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatToken, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { ClosedPosition } from "@/types/portfolio";

import { pnlColor, pnlText, sideColor, sideLabel, tokenText } from "./position-format";

type TraderHistoryListProps = {
  history: readonly ClosedPosition[];
  winRateBps: number;
  onExplorer: () => void;
};

type HistoryRowProps = {
  position: ClosedPosition;
  open: boolean;
  onToggle: () => void;
  onExplorer: () => void;
};

function detailRows(position: ClosedPosition): readonly (readonly [string, string])[] {
  if (position.farm) {
    return [
      ["Deposited", tokenText(position.sizeTokens, position.symbol)],
      ["Borrowed", `${formatToken({ raw: position.farm.borrowed, decimals: 6 }, 2)} USDC`],
      ["Deployed to", position.farm.deployedTo],
      ["Net APR", formatPercent(position.farm.netAprBps)],
    ];
  }
  const entryExit: (readonly [string, string])[] =
    position.entryPrice !== undefined && position.exitPrice !== undefined
      ? [["Entry → exit", `${formatUsd(position.entryPrice)} → ${formatUsd(position.exitPrice)}`]]
      : [];
  return [
    ...entryExit,
    ["Size", tokenText(position.sizeTokens, position.symbol)],
    ["Collateral", formatUsd(position.collateral)],
    ["Fees paid", formatUsd(position.fees)],
  ];
}

function HistoryRow({ position, open, onToggle, onExplorer }: HistoryRowProps) {
  const { colors, radius, spacing } = useTheme();
  const { amount, percent } = pnlText(position.pnl, position.pnlBps);
  const color = pnlColor(position.pnl);
  const side = position.kind === "perp" ? position.side : undefined;
  const label = sideLabel(side, position.leverage);

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.divider }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${position.pair}, ${label}, ${amount}`}
        accessibilityState={{ expanded: open }}
        android_ripple={ripple(colors.text)}
        onPress={onToggle}
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 72, paddingVertical: spacing.md }}
      >
        <TokenIcon symbol={position.symbol} size={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" strong>
            {position.pair}
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            <AppText variant="caption" strong color={sideColor(side)}>
              {label}
            </AppText>
            {` · ${position.closedOn} · ${position.duration}`}
          </AppText>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <AppText variant="body" strong color={color}>
            {amount}
          </AppText>
          <AppText variant="caption" color={color}>
            {percent}
          </AppText>
        </View>
        <Icon name="keyboard_arrow_down" size={16} color="textMuted" rotate={open ? 180 : 0} />
      </Pressable>
      {open ? (
        <View
          style={{
            marginLeft: 48,
            marginBottom: spacing.md,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.sm,
            backgroundColor: colors.background,
          }}
        >
          {detailRows(position).map(([name, value]) => (
            <View key={name} style={{ height: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <AppText variant="caption" color="textMuted">
                {name}
              </AppText>
              <AppText variant="caption" strong>
                {value}
              </AppText>
            </View>
          ))}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="View on Solana Explorer"
            onPress={onExplorer}
            hitSlop={{ top: 6, bottom: 6 }}
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

export function TraderHistoryList({ history, winRateBps, onExplorer }: TraderHistoryListProps) {
  const { colors, spacing } = useTheme();
  const [openId, setOpenId] = useState<string | null>(history[0]?.id ?? null);

  return (
    <Card padded={false} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.divider }}>
        <AppText variant="body" color="textMuted">
          Win rate
        </AppText>
        <AppText variant="bodyLg" strong style={{ lineHeight: 24 }}>{`${Math.round(winRateBps / 100)}%`}</AppText>
      </View>
      {history.map((position) => (
        <HistoryRow
          key={position.id}
          position={position}
          open={openId === position.id}
          onToggle={() => setOpenId((current) => (current === position.id ? null : position.id))}
          onExplorer={onExplorer}
        />
      ))}
      <View style={{ height: 48, alignItems: "center", justifyContent: "center" }}>
        <AppText variant="caption" color="textMuted">
          Showing the last 30 days
        </AppText>
      </View>
    </Card>
  );
}
