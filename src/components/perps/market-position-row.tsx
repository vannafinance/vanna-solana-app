import { CaretRight } from "phosphor-react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import type { PositionSummary } from "@/types/perps";
import { useTheme } from "@/theme/use-theme";

import { formatLiquidationPrice, formatTokenSize, sideLabel } from "./format-perps";

type MarketPositionRowProps = {
  position: PositionSummary;
  onPress: () => void;
};

export function MarketPositionRow({ position, onPress }: MarketPositionRowProps) {
  const { colors, spacing } = useTheme();
  const tone = position.pnl >= 0n ? "positive" : "negative";
  const title = `${sideLabel(position.side)} ${position.leverage}x · ${formatTokenSize(position.tokens, position.symbol)}`;
  const detail = `Entry ${formatUsd(position.entryPrice)} · liq. ${formatLiquidationPrice(position.liquidationPrice)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}, ${formatSignedUsd(position.pnl)}`}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyLg" strong>
          {title}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {detail}
        </AppText>
      </View>
      <AppText variant="bodyLg" strong color={tone}>
        {formatSignedUsd(position.pnl)}
      </AppText>
      <CaretRight size={16} color={colors.textMuted} />
    </Pressable>
  );
}
