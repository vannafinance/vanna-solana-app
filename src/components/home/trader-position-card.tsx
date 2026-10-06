import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { StatStrip } from "@/components/ui/stat-strip";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { FarmPosition, PerpPosition, Position } from "@/types/portfolio";

import { healthColor, healthLabel, pnlColor, pnlText, sideLabel, tokenText } from "./position-format";

type TraderPositionCardProps = {
  position: Position;
  onPrimary: () => void;
  onSecondary: () => void;
};

// Token, pair, a side badge that carries the leverage and the open date; P&L on the right over its percentage.
function CardHeader({ position }: { position: Position }) {
  const { spacing } = useTheme();
  const { amount, percent } = pnlText(position.pnl, position.pnlBps);
  const color = pnlColor(position.pnl);
  const farm = position.kind === "farm";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <TokenIcon symbol={position.symbol} size={40} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="bodyLg" strong numberOfLines={1} style={{ lineHeight: 20 }}>
          {farm ? `${position.symbol} → USDC` : position.pair}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Pill shape="tag" tone={farm ? "teal" : position.side} label={sideLabel(farm ? undefined : position.side, position.leverage)} />
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {`Since ${position.openedOn}`}
          </AppText>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <AppText variant="bodyLg" strong color={color} numberOfLines={1} style={{ lineHeight: 20 }}>
          {amount}
        </AppText>
        <AppText variant="caption" color={color} numberOfLines={1}>
          {percent}
        </AppText>
      </View>
    </View>
  );
}

function PerpFigures({ position }: { position: PerpPosition }) {
  return (
    <>
      <StatStrip
        stats={[
          { label: "Size", value: formatUsd(position.size), sub: tokenText(position.sizeTokens, position.symbol) },
          { label: "Collateral", value: formatUsd(position.collateral), sub: "USDC" },
          { label: "Liq. price", value: formatUsd(position.liquidationPrice), sub: `${formatPercent(position.liquidationAwayBps, 1)} away` },
        ]}
      />
      <StatStrip
        stats={[
          { label: "Entry price", value: formatUsd(position.entryPrice) },
          { label: "Mark price", value: formatUsd(position.markPrice) },
        ]}
      />
    </>
  );
}

function FarmFigures({ position }: { position: FarmPosition }) {
  return (
    <>
      <StatStrip
        stats={[
          { label: "Collateral", value: formatUsd(position.collateral), sub: tokenText(position.sizeTokens, position.symbol) },
          { label: "Borrowed", value: formatUsd(position.borrowed), sub: position.pool },
          { label: "Liq. price", value: formatUsd(position.liquidationPrice), sub: `${formatPercent(position.liquidationAwayBps, 0)} away` },
        ]}
      />
      <StatStrip
        stats={[
          { label: "Position health", value: position.health.toFixed(2), sub: healthLabel(position.health), valueColor: healthColor(position.health) },
          { label: "Net APR", value: formatPercent(position.netAprBps), sub: position.venue },
        ]}
      />
    </>
  );
}

// One open Margin trade or Farm position: header row, its figures in two strips, then its actions.
export function TraderPositionCard({ position, onPrimary, onSecondary }: TraderPositionCardProps) {
  const { spacing } = useTheme();

  return (
    <Card>
      <CardHeader position={position} />
      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>{position.kind === "farm" ? <FarmFigures position={position} /> : <PerpFigures position={position} />}</View>
      <View style={{ marginTop: spacing.md, flexDirection: "row", gap: spacing.sm }}>
        <Button flex size="sm" variant="outline" label={position.kind === "farm" ? "Details" : "Add collateral"} onPress={onPrimary} />
        <Button flex size="sm" variant="dark" label="Close position" onPress={onSecondary} />
      </View>
    </Card>
  );
}
