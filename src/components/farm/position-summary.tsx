import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { StatStrip } from "@/components/ui/stat-strip";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatSignedPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import { health as thresholds } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { FarmPositionView } from "@/types/farm";

import { pairLabel, signedTone, withSymbol } from "./farm-format";
import { HealthValue } from "@/components/ui/health-value";

// The position's name and leverage, with its health on the right.
export function PositionTitle({ position }: { position: FarmPositionView }) {
  const { spacing } = useTheme();
  const health = Number.isFinite(position.healthFactor) ? position.healthFactor : null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 }}>
      <TokenIcon symbol={position.collateralSymbol} size={40} />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <AppText variant="bodyLg" strong numberOfLines={1} style={{ flexShrink: 1 }}>
          {pairLabel(position.collateralSymbol, position.poolSymbol)}
        </AppText>
        <Pill label={`${position.leverage.toFixed(2)}x`} tone="purple" />
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <HealthValue value={health} />
        <AppText variant="caption" color="textMuted">
          Health factor
        </AppText>
      </View>
    </View>
  );
}

// Shown only while the position's health is below the safe line.
function HealthNotice({ health }: { health: number }) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.pinkTint }}>
      <Icon name="warning" filled size={18} color="onPinkTint" />
      <AppText variant="caption" color="onPinkTint" style={{ flex: 1 }}>
        {`Health ${health.toFixed(2)} is near liquidation at ${thresholds.liquidation.toFixed(2)}. Close part to lower the risk.`}
      </AppText>
    </View>
  );
}

// One farm position's own figures, in the same blocks on the Positions card and the position's page: its title, where the
// money is, then what it earns and where it is liquidated.
export function PositionSummary({ position }: { position: FarmPositionView }) {
  const { spacing } = useTheme();
  const pool = position.poolSymbol;
  const noLiquidation = position.liquidationPriceUsd === 0n;
  const watch = Number.isFinite(position.healthFactor) && position.healthFactor < thresholds.safeFrom;

  return (
    <View style={{ gap: spacing.md }}>
      <PositionTitle position={position} />
      <StatStrip
        stats={[
          { label: "Deposited", value: formatUsd(position.collateralValueUsd), sub: withSymbol(position.collateral, position.collateralSymbol) },
          { label: "Borrowed", value: formatUsd(position.debtValueUsd), sub: withSymbol(position.debt, pool) },
          { label: "In Kamino", value: formatUsd(position.suppliedValueUsd), sub: withSymbol(position.supplied, pool) },
        ]}
      />
      <StatStrip
        stats={[
          {
            label: "Liq. price",
            value: noLiquidation ? "None" : formatUsd(position.liquidationPriceUsd),
            sub: noLiquidation ? "Kamino covers it" : `${formatPercent(position.liquidationAwayBps, 0)} away`,
          },
          { label: "Net APY", value: formatSignedPercent(position.netApyBps), valueColor: signedTone(position.netApyBps) },
          { label: "Earned", value: formatSignedUsd(position.earningsUsd), valueColor: signedTone(position.earningsUsd) },
        ]}
      />
      {watch ? <HealthNotice health={position.healthFactor} /> : null}
    </View>
  );
}
