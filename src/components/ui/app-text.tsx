import { Text, type TextProps } from "react-native";

import { type ThemeColor, useTheme } from "@/theme/use-theme";

const variants = {
  display: { size: "display", weight: "semibold", line: 40 },
  heading: { size: "heading", weight: "semibold", line: 28 },
  title: { size: "title", weight: "semibold", line: 24 },
  bodyLg: { size: "bodyLg", weight: "regular", line: 22 },
  body: { size: "body", weight: "regular", line: 20 },
  label: { size: "label", weight: "regular", line: 16 },
  caption: { size: "caption", weight: "regular", line: 16 },
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
          lineHeight: spec.line,
          fontFamily: fontFamily[weight],
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
    />
  );
}
