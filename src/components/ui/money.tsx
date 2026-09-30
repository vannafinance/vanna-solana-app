import type { TextStyle } from "react-native";

import type { ThemeColor } from "@/theme/use-theme";

import { AppText, type TextVariant } from "./app-text";

type MoneyProps = {
  value: string;
  variant?: TextVariant;
  color?: ThemeColor;
  style?: TextStyle;
};

export function Money({ value, variant = "display", color = "text", style }: MoneyProps) {
  const point = value.lastIndexOf(".");
  const whole = point === -1 ? value : value.slice(0, point);
  const fraction = point === -1 ? "" : value.slice(point);

  return (
    <AppText variant={variant} color={color} style={style} accessibilityLabel={value}>
      {whole}
      <AppText variant={variant} color={color} style={{ opacity: 0.62 }}>
        {fraction}
      </AppText>
    </AppText>
  );
}
