import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatPercent, formatSignedPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import { formatLiquidationPrice, formatTokenSize, sideLabel } from "@/format/format-perps";
import { useTheme } from "@/theme/use-theme";
import type { PositionSummary } from "@/types/perps";

import { SideTag } from "./side-tag";

type MarketPositionRowProps = {
  position: PositionSummary;
  onPress: () => void;
};

// The user's position in the market on the market page, as a card: title row, side and P&L, then its figures as a strip.
// The whole card opens the Positions page, where it can be managed.
export function MarketPositionRow({ position, onPress }: MarketPositionRowProps) {
  const { colors, radius, shadow, spacing } = useTheme();
  const pnlColor = position.pnl >= 0n ? "positive" : "negative";
  const tokens = formatTokenSize(position.tokens, position.symbol);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Your position, ${sideLabel(position.side)} ${position.leverage}x, ${tokens}, P&L ${formatSignedUsd(position.pnl)}. Opens your positions`}
      android_ripple={ripple(colors.text)}
      onPress={onPress}
      style={[{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surface }, shadow.card]}
    >
      <View style={{ height: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="bodyLg" strong>
          Your position
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <AppText variant="body" strong color="link">
            Manage
          </AppText>
          <Icon name="chevron_right" size={16} color="link" />
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <SideTag side={position.side} leverage={position.leverage} />
        <AppText variant="body" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
          {`Since ${position.openedOn}`}
        </AppText>
        <View style={{ alignItems: "flex-end" }}>
          <AppText variant="bodyLg" strong color={pnlColor}>
            {formatSignedUsd(position.pnl)}
          </AppText>
          <AppText variant="caption" color={pnlColor}>
            {formatSignedPercent(position.pnlBps)}
          </AppText>
        </View>
      </View>
      <StatStrip
        stats={[
          { label: "Size", value: formatUsd(position.sizeUsd), sub: tokens },
          { label: "Collateral", value: formatUsd(position.collateral), sub: "USDC" },
          { label: "Entry price", value: formatUsd(position.entryPrice) },
          {
            label: "Liq. price",
            value: formatLiquidationPrice(position.liquidationPrice),
            sub: position.liquidationPrice === 0n ? undefined : `${formatPercent(position.liquidationDistanceBps, 1)} away`,
          },
        ]}
      />
    </Pressable>
  );
}
