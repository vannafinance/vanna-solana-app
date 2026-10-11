import { Pressable } from "react-native";

import { type ThemeColor, useTheme } from "@/theme/use-theme";

import { Glyph, type GlyphSource } from "./glyph";
import { ripple } from "./ripple";

type IconButtonProps = {
  icon: GlyphSource;
  label: string;
  onPress: () => void;
  tone?: "glass" | "plain" | "outline" | "tonal";
  color?: ThemeColor;
  size?: number;
};

export function IconButton({ icon, label, onPress, tone = "plain", color = "text", size = 48 }: IconButtonProps) {
  const { colors, radius } = useTheme();
  const glass = tone === "glass";
  const foreground = glass ? colors.onHero : colors[color];
  const background = glass ? colors.heroGlass : tone === "tonal" ? colors.background : "transparent";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      android_ripple={ripple(foreground, false)}
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: background,
        borderWidth: tone === "outline" ? 1 : 0,
        borderColor: colors.border,
      }}
    >
      <Glyph source={icon} size={Math.round(size * 0.5)} color={foreground} />
    </Pressable>
  );
}
