import { Text, type TextProps } from "react-native";

import { type ThemeColor, useTheme } from "@/theme/use-theme";

const variants = {
  display: { size: "display", weight: "semibold" },
  heading: { size: "heading", weight: "semibold" },
  title: { size: "title", weight: "semibold" },
  bodyLg: { size: "bodyLg", weight: "regular" },
  body: { size: "body", weight: "regular" },
  label: { size: "label", weight: "regular" },
  caption: { size: "caption", weight: "regular" },
} as const;

export type TextVariant = keyof typeof variants;

type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: ThemeColor;
  strong?: boolean;
};

export function AppText({ variant = "body", color = "text", strong, style, ...rest }: AppTextProps) {
  const { colors, fontSize, fontFamily } = useTheme();
  const spec = variants[variant];
  const weight = strong ? "semibold" : spec.weight;

  return (
    <Text
      {...rest}
      style={[
        {
          color: colors[color],
          fontSize: fontSize[spec.size],
          fontFamily: fontFamily[weight],
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
    />
  );
}
