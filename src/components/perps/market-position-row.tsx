import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { formatLiquidationPrice, formatTokenSize, sideLabel } from "@/format/format-perps";
import { useTheme } from "@/theme/use-theme";
import type { PositionSummary } from "@/types/perps";

type MarketPositionRowProps = {
  position: PositionSummary;
  onPress: () => void;
};

export function MarketPositionRow({ position, onPress }: MarketPositionRowProps) {
  const { colors } = useTheme();
  const title = `${sideLabel(position.side)} ${position.leverage}x · ${formatTokenSize(position.tokens, position.symbol)}`;
  const detail = `Entry ${formatUsd(position.entryPrice)} · liq. ${formatLiquidationPrice(position.liquidationPrice)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}, ${formatSignedUsd(position.pnl)}`}
      android_ripple={ripple(colors.text)}
      onPress={onPress}
      style={{ height: 64, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: colors.divider }}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="bodyLg" strong>
          {title}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {detail}
        </AppText>
      </View>
      <AppText variant="bodyLg" strong color={position.pnl >= 0n ? "positive" : "negative"}>
        {formatSignedUsd(position.pnl)}
      </AppText>
      <Icon name="chevron_right" size={16} color="textMuted" filled />
    </Pressable>
  );
}
