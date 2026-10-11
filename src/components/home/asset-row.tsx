import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

import { pnlColor } from "./position-format";

type AssetRowProps = {
  symbol: TokenSymbol;
  // The muted line under the symbol: the amount held.
  detail: string;
  value: string;
  change?: string;
  changeBps?: number;
  first?: boolean;
};

// One token in a list: icon, symbol over the amount held, and on the right its value over today's change.
export function AssetRow({ symbol, detail, value, change, changeBps, first = false }: AssetRowProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={change ? `${symbol}, ${detail}, ${value}, ${change}` : `${symbol}, ${detail}, ${value}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        minHeight: 64,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <TokenIcon symbol={symbol} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" strong numberOfLines={1}>
          {symbol}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {detail}
        </AppText>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <AppText variant="body" strong numberOfLines={1}>
          {value}
        </AppText>
        {change === undefined || changeBps === undefined ? null : (
          <AppText variant="caption" color={pnlColor(BigInt(changeBps))} numberOfLines={1}>
            {change}
          </AppText>
        )}
      </View>
    </View>
  );
}
