import { CaretRight } from "phosphor-react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon } from "@/components/ui/token-icon";
import type { PerpsSymbol } from "@/types/perps";
import { useTheme } from "@/theme/use-theme";

type OpenPositionsStripProps = {
  symbols: readonly PerpsSymbol[];
  pnl: string;
  pnlPositive: boolean;
  onPress: () => void;
};

export function OpenPositionsStrip({ symbols, pnl, pnlPositive, onPress }: OpenPositionsStripProps) {
  const { colors, spacing } = useTheme();
  const count = symbols.length;
  const label = `${count} open ${count === 1 ? "position" : "positions"}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, open profit and loss ${pnl}`}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        minHeight: 44,
        marginTop: spacing.lg,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: colors.heroDivider,
      }}
    >
      <View style={{ flexDirection: "row" }}>
        {symbols.map((symbol, index) => (
          <View
            key={symbol}
            style={{ marginLeft: index === 0 ? 0 : -8, borderRadius: 999, borderWidth: 2, borderColor: colors.heroGlass }}
          >
            <TokenIcon symbol={symbol} size={24} />
          </View>
        ))}
      </View>
      <AppText variant="body" strong color="onHero" style={{ flex: 1 }}>
        {label}
      </AppText>
      {count > 0 ? (
        <AppText variant="bodyLg" strong style={{ color: pnlPositive ? colors.heroPositive : colors.short }}>
          {pnl}
        </AppText>
      ) : null}
      <CaretRight size={16} color={colors.onHero} />
    </Pressable>
  );
}
