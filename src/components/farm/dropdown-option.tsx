import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

type DropdownOptionProps = {
  symbol: TokenSymbol;
  selected: boolean;
  primary: string;
  primaryColor?: ThemeColor;
  secondary?: string;
  onPress: () => void;
};

export function DropdownOption({ symbol, selected, primary, primaryColor = "text", secondary, onPress }: DropdownOptionProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={secondary ? `${symbol}, ${primary}, ${secondary}` : `${symbol}, ${primary}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 60,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: 10,
        borderRadius: radius.sm,
        backgroundColor: selected ? colors.purpleTint : "transparent",
      }}
    >
      <TokenIcon symbol={symbol} size={32} />
      <AppText variant="bodyLg" strong color={selected ? "link" : "text"} style={{ flex: 1 }}>
        {symbol}
      </AppText>
      <View style={{ alignItems: "flex-end" }}>
        <AppText variant="bodyLg" strong={primaryColor !== "text"} color={primaryColor}>
          {primary}
        </AppText>
        {secondary ? (
          <AppText variant="label" color="textMuted">
            {secondary}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
