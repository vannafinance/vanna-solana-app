import Svg, { Path } from "react-native-svg";

import { type ThemeColor, useTheme } from "@/theme/use-theme";

import { type IconName, materialSymbols } from "./material-symbols";

type IconProps = {
  name: IconName;
  size?: number;
  color?: ThemeColor | (string & {});
  filled?: boolean;
  bold?: boolean;
  rotate?: number;
};

export function Icon({ name, size = 24, color = "text", filled, bold, rotate }: IconProps) {
  const { colors } = useTheme();
  const variants: Partial<Record<"regular" | "filled" | "bold", string>> = materialSymbols[name];
  const path = (filled && variants.filled) || (bold && variants.bold) || variants.regular;
  const fill = color in colors ? colors[color as ThemeColor] : color;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      style={rotate ? { transform: [{ rotate: `${rotate}deg` }] } : undefined}
    >
      <Path d={path} fill={fill} />
    </Svg>
  );
}
