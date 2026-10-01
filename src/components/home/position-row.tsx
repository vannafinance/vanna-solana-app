import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ripple } from "@/components/ui/ripple";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { Position } from "@/types/portfolio";

import { pnlColor, pnlText, sideColor, sideLabel } from "./position-format";

type PositionRowProps = {
  position: Position;
  first?: boolean;
  onPress: () => void;
};

export function PositionRow({ position, first = false, onPress }: PositionRowProps) {
  const { colors, spacing } = useTheme();
  const side = position.kind === "perp" ? position.side : undefined;
  const { amount, percent } = pnlText(position.pnl, position.pnlBps);
  const title = position.kind === "farm" ? position.pair : position.symbol;
  const secondary = position.kind === "farm" ? `${formatPercent(position.netAprBps)} net APR` : percent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} ${sideLabel(side, position.leverage)}, ${amount}`}
      onPress={onPress}
      android_ripple={ripple(colors.text)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        minHeight: 64,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <TokenIcon symbol={position.symbol} size={40} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyLg" strong>
          {title}
        </AppText>
        <AppText variant="caption" strong color={sideColor(side)}>
          {sideLabel(side, position.leverage)}
        </AppText>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <AppText variant="bodyLg" strong color={pnlColor(position.pnl)}>
          {amount}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {secondary}
        </AppText>
      </View>
    </Pressable>
  );
}
