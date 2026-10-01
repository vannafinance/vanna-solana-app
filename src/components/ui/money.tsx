import type { TextStyle } from "react-native";

import type { ThemeColor } from "@/theme/use-theme";
import { useTheme } from "@/theme/use-theme";

import { AppText, type TextVariant } from "./app-text";

type MoneyProps = {
  value: string;
  variant?: TextVariant;
  color?: ThemeColor;
  style?: TextStyle;
};

export function Money({ value, variant = "display", color = "text", style }: MoneyProps) {
  const { colors } = useTheme();
  const base = colors[color];
  const dimmed = /^#[0-9A-Fa-f]{6}$/.test(base) ? `${base}8F` : base;
  const point = value.lastIndexOf(".");
  const whole = point === -1 ? value : value.slice(0, point);
  const fraction = point === -1 ? "" : value.slice(point);

  return (
    <AppText variant={variant} color={color} style={style} accessibilityLabel={value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
      {whole}
      <AppText variant={variant} color={color} style={{ color: dimmed }}>
        {fraction}
      </AppText>
    </AppText>
  );
}
