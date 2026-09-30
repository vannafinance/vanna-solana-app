import type { Icon } from "phosphor-react-native";
import { Pressable } from "react-native";

import { type ThemeColor, useTheme } from "@/theme/use-theme";

type IconButtonProps = {
  icon: Icon;
  label: string;
  onPress: () => void;
  tone?: "glass" | "plain" | "outline";
  color?: ThemeColor;
  size?: number;
};

export function IconButton({ icon: Glyph, label, onPress, tone = "plain", color = "text", size = 44 }: IconButtonProps) {
  const { colors, radius } = useTheme();
  const glass = tone === "glass";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: glass ? colors.heroGlass : "transparent",
        borderWidth: tone === "outline" ? 1 : 0,
        borderColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Glyph size={size * 0.5} color={glass ? colors.onHero : colors[color]} />
    </Pressable>
  );
}
