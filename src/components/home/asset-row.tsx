import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

import { pnlColor } from "./position-format";

type AssetRowProps = {
  symbol: TokenSymbol;
  detail: string;
  value: string;
  change?: string;
  changeBps?: number;
  first?: boolean;
};

export function AssetRow({ symbol, detail, value, change, changeBps, first = false }: AssetRowProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      accessibilityLabel={change ? `${symbol}, ${value}, ${change}` : `${symbol}, ${value}`}
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
      <View style={{ flex: 1 }}>
        <AppText variant="bodyLg" strong>
          {symbol}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {detail}
        </AppText>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <AppText variant="bodyLg" strong>
          {value}
        </AppText>
        {change === undefined || changeBps === undefined ? null : (
          <AppText variant="caption" color={pnlColor(BigInt(changeBps))}>
            {change}
          </AppText>
        )}
      </View>
    </View>
  );
}
