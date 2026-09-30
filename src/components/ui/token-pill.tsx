import { CaretDown } from "phosphor-react-native";
import { Pressable, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { TokenIcon, type TokenSymbol } from "./token-icon";

type TokenPillProps = {
  symbol: TokenSymbol;
  onPress?: () => void;
};

export function TokenPill({ symbol, onPress }: TokenPillProps) {
  const { colors, radius } = useTheme();
  const content = (
    <>
      <TokenIcon symbol={symbol} size={32} />
      <AppText variant="bodyLg" strong>
        {symbol}
      </AppText>
      {onPress ? <CaretDown size={16} color={colors.text} /> : null}
    </>
  );
  const style = {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.segment,
  } as const;

  if (!onPress) return <View style={style}>{content}</View>;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Choose token, ${symbol} selected`} onPress={onPress} style={style}>
      {content}
    </Pressable>
  );
}
