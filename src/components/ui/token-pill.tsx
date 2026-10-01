import { Pressable, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { ripple } from "./ripple";
import { TokenIcon, type TokenSymbol } from "./token-icon";

type TokenPillProps = {
  symbol: TokenSymbol;
  onPress?: () => void;
};

export function TokenPill({ symbol, onPress }: TokenPillProps) {
  const { colors } = useTheme();
  const content = (
    <>
      <TokenIcon symbol={symbol} size={28} />
      <AppText variant="body" strong>
        {symbol}
      </AppText>
      {onPress ? <Icon name="keyboard_arrow_down" size={18} color="text" /> : null}
    </>
  );
  const style = {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingLeft: 6,
    paddingRight: onPress ? 8 : 12,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.background,
  } as const;

  if (!onPress) return <View style={style}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Choose token, ${symbol} selected`}
      android_ripple={ripple(colors.text)}
      hitSlop={{ top: 2, bottom: 2 }}
      onPress={onPress}
      style={style}
    >
      {content}
    </Pressable>
  );
}
