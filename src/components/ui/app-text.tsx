import { Text, type TextProps } from "react-native";

import { type ThemeColor, useTheme } from "@/theme/use-theme";

// `scale` is how far the phone's font-size setting may enlarge this text. The app honours the setting, but only up to a limit: the
// dense parts (table headings, tags, figures in cells) are laid out for text a little bigger than default, and a phone set to
// Extra large would otherwise push them past their boxes. Large headings already have room, so they are held lower still.
const variants = {
  display: { size: "display", weight: "semibold", line: 40, scale: 1.1 },
  heading: { size: "heading", weight: "semibold", line: 28, scale: 1.15 },
  title: { size: "title", weight: "semibold", line: 24, scale: 1.2 },
  bodyLg: { size: "bodyLg", weight: "regular", line: 22, scale: 1.2 },
  body: { size: "body", weight: "regular", line: 20, scale: 1.2 },
  label: { size: "label", weight: "regular", line: 16, scale: 1.15 },
  caption: { size: "caption", weight: "regular", line: 16, scale: 1.15 },
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
      maxFontSizeMultiplier={spec.scale}
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
