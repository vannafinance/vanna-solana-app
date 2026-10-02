import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatUsd } from "@/format/format-amount";
import { health as thresholds } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { FarmPosition, PerpPosition, Position } from "@/types/portfolio";

import { HealthArc } from "./health-arc";
import { healthColor, pnlColor, pnlText, tokenText } from "./position-format";
import { StatPanel } from "./stat-panel";

type TraderPositionCardProps = {
  position: Position;
  onPrimary: () => void;
  onSecondary: () => void;
};

function CardHeader({ position }: { position: Position }) {
  const { spacing } = useTheme();
  const { amount, percent } = pnlText(position.pnl, position.pnlBps);
  const color = pnlColor(position.pnl);
  const tag = position.kind === "farm" ? "Farm" : position.side === "long" ? "Long" : "Short";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <TokenIcon symbol={position.symbol} size={40} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="bodyLg" strong numberOfLines={1} style={{ lineHeight: 20 }}>
          {position.kind === "farm" ? `${position.symbol} → USDC` : position.pair}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Pill shape="tag" tone={position.kind === "farm" ? "teal" : position.side} label={`${tag} ${position.leverage}x`} />
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {position.kind === "farm" ? `${position.venue} · since ${position.openedOn}` : `Since ${position.openedOn}`}
          </AppText>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <AppText variant="bodyLg" strong color={color} style={{ lineHeight: 20 }}>
          {amount}
        </AppText>
        <AppText variant="caption" color={position.kind === "farm" ? "textMuted" : color}>
          {position.kind === "farm" ? `${formatPercent(position.netAprBps)} net APR` : percent}
        </AppText>
      </View>
    </View>
  );
}

function PerpDetails({ position }: { position: PerpPosition }) {
  const { spacing } = useTheme();

  return (
    <>
      <View style={{ marginTop: spacing.lg }}>
        <StatPanel
          stats={[
            { label: "Size", value: formatUsd(position.size), sub: tokenText(position.sizeTokens, position.symbol) },
            { label: "Collateral", value: formatUsd(position.collateral), sub: "USDC" },
            { label: "Liq. price", value: formatUsd(position.liquidationPrice), sub: `${formatPercent(position.liquidationAwayBps, 1)} away` },
          ]}
        />
      </View>
      <View style={{ marginTop: spacing.md, height: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="body" color="textMuted">
          Entry → mark
        </AppText>
        <AppText variant="body" strong>{`${formatUsd(position.entryPrice)} → ${formatUsd(position.markPrice)}`}</AppText>
      </View>
    </>
  );
}

function FarmDetails({ position }: { position: FarmPosition }) {
  const { colors, spacing } = useTheme();

  return (
    <>
      <View style={{ marginTop: spacing.lg }}>
        <StatPanel
          stats={[
            { label: "Collateral", value: formatUsd(position.collateral), sub: tokenText(position.sizeTokens, position.symbol) },
            { label: "Borrowed", value: formatUsd(position.borrowed), sub: position.pool },
            { label: "Liq. price", value: formatUsd(position.liquidationPrice), sub: `${formatPercent(position.liquidationAwayBps, 0)} away` },
          ]}
        />
      </View>
      <View style={{ marginTop: spacing.md, height: 20, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <HealthArc health={position.health} width={16} height={8} track={colors.divider} fill={colors[healthColor(position.health)]} />
        <AppText variant="body" strong>{`Health ${position.health.toFixed(2)}`}</AppText>
        <AppText variant="body" color="textMuted">{`· liquidation at ${thresholds.liquidation.toFixed(2)}`}</AppText>
      </View>
    </>
  );
}

export function TraderPositionCard({ position, onPrimary, onSecondary }: TraderPositionCardProps) {
  const { spacing } = useTheme();

  return (
    <Card>
      <CardHeader position={position} />
      {position.kind === "farm" ? <FarmDetails position={position} /> : <PerpDetails position={position} />}
      <View style={{ marginTop: spacing.lg, flexDirection: "row", gap: spacing.sm }}>
        <Button flex size="sm" variant="outline" label={position.kind === "farm" ? "Details" : "Add collateral"} onPress={onPrimary} />
        <Button flex size="sm" variant="dark" label="Close position" onPress={onSecondary} />
      </View>
    </Card>
  );
}
