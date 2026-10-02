import { Image } from "expo-image";

import { useTheme } from "@/theme/use-theme";

const sources = {
  TSLAx: require("../../../assets/images/tokens/tslax.png"),
  GOOGLx: require("../../../assets/images/tokens/googlx.png"),
  AAPLx: require("../../../assets/images/tokens/aaplx.png"),
  ANTHROPIC: require("../../../assets/images/tokens/anthropic.png"),
  OPENAI: require("../../../assets/images/tokens/openai.png"),
  SOL: require("../../../assets/images/tokens/sol.png"),
  USDC: require("../../../assets/images/tokens/usdc.png"),
} as const;

export type TokenSymbol = keyof typeof sources;

export function isTokenSymbol(value: string): value is TokenSymbol {
  return value in sources;
}

type TokenIconProps = {
  symbol: TokenSymbol;
  size?: number;
};

export function TokenIcon({ symbol, size = 40 }: TokenIconProps) {
  const { radius } = useTheme();

  return <Image accessibilityLabel={symbol} source={sources[symbol]} style={{ width: size, height: size, borderRadius: radius.pill }} />;
}
