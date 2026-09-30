import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { Position } from "@/types/portfolio";

import { healthLabel, pnlColor, pnlText, sideLabel, tokenText } from "./position-format";
import { StatPanel, type Stat } from "./stat-panel";

type TraderPositionCardProps = {
  position: Position;
  onAddCollateral: () => void;
  onClose: () => void;
};

function statsFor(position: Position): Stat[] {
  if (position.kind === "perp") {
    return [
      { label: "Size", value: formatUsd(position.size), sub: tokenText(position.sizeTokens, position.symbol) },
      { label: "Collateral", value: formatUsd(position.collateral), sub: "USDC" },
      { label: "Liq. price", value: formatUsd(position.liquidationPrice), sub: `${formatPercent(position.liquidationAwayBps, 1)} away` },
    ];
  }
  return [
    { label: "Deployed", value: formatUsd(position.size), sub: position.symbol },
    { label: "Collateral", value: formatUsd(position.collateral), sub: "USDC" },
    { label: "Health", value: position.health.toFixed(2), sub: healthLabel(position.health) },
  ];
}

export function TraderPositionCard({ position, onAddCollateral, onClose }: TraderPositionCardProps) {
  const { spacing } = useTheme();
  const { amount, percent } = pnlText(position.pnl, position.pnlBps);
  const color = pnlColor(position.pnl);
  const side = position.kind === "perp" ? position.side : undefined;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <TokenIcon symbol={position.symbol} size={40} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="title">{position.pair}</AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Pill label={sideLabel(side, position.leverage)} tone={side === "short" ? "short" : side === "long" ? "long" : "pink"} />
            <AppText variant="body" color="textMuted">{`Since ${position.openedOn}`}</AppText>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <AppText variant="title" color={color}>
            {amount}
          </AppText>
          <AppText variant="body" color={color}>
            {percent}
          </AppText>
        </View>
      </View>
      <StatPanel stats={statsFor(position)} />
      {position.kind === "perp" ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText variant="bodyLg" color="textMuted">
            Entry → mark
          </AppText>
          <AppText variant="bodyLg" strong>{`${formatUsd(position.entryPrice)} → ${formatUsd(position.markPrice)}`}</AppText>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Button flex size="md" variant="outline" label="Add collateral" onPress={onAddCollateral} />
        <Button flex size="md" variant="dark" label="Close position" onPress={onClose} />
      </View>
    </Card>
  );
}
