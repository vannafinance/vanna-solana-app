import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";
import type { Position } from "@/types/portfolio";

import { pnlColor, pnlText, sideColor, sideLabel } from "./position-format";

type PositionRowProps = {
  position: Position;
  last?: boolean;
  onPress: () => void;
};

export function PositionRow({ position, last = false, onPress }: PositionRowProps) {
  const { colors, spacing } = useTheme();
  const side = position.kind === "perp" ? position.side : undefined;
  const { amount, percent } = pnlText(position.pnl, position.pnlBps);
  const color = pnlColor(position.pnl);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${position.symbol} ${sideLabel(side, position.leverage)}, ${amount}`}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        minHeight: 72,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
      }}
    >
      <TokenIcon symbol={position.symbol} size={40} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyLg" strong>
          {position.symbol}
        </AppText>
        <AppText variant="body" strong color={sideColor(side)}>
          {sideLabel(side, position.leverage)}
        </AppText>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <AppText variant="bodyLg" strong color={color}>
          {amount}
        </AppText>
        <AppText variant="body" color="textMuted">
          {percent}
        </AppText>
      </View>
    </Pressable>
  );
}
