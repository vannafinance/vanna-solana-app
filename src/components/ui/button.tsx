import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { brandGradient, horizontalGradient, spaceGradients } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Glyph, type GlyphSource } from "./glyph";
import { ripple } from "./ripple";
import { useSpace } from "./space-scope";

export type ButtonVariant = "primary" | "tonal" | "dark" | "outline" | "text" | "danger";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: GlyphSource;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  flex?: boolean;
  brand?: boolean;
};

const HEIGHT = { lg: 56, md: 48, sm: 44 } as const;

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  size = "lg",
  loading = false,
  disabled = false,
  flex = false,
  brand = false,
}: ButtonProps) {
  const { colors } = useTheme();
  const space = useSpace();
  const inactive = disabled || loading;
  const height = HEIGHT[size];

  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: "transparent" },
    tonal: { bg: colors.purpleTint, fg: colors.onPurpleTint, border: "transparent" },
    dark: { bg: colors.chipActive, fg: colors.onChipActive, border: "transparent" },
    outline: { bg: colors.surface, fg: colors.text, border: colors.borderStrong },
    text: { bg: "transparent", fg: colors.text, border: "transparent" },
    danger: { bg: colors.badgeNegative, fg: colors.onPrimary, border: "transparent" },
  }[variant];
  const gradient = variant === "primary" && !disabled ? (brand ? brandGradient : spaceGradients[space].cta) : null;
  const background = disabled && variant !== "text" ? colors.disabled : gradient ? "transparent" : palette.bg;
  const foreground = disabled ? colors.onDisabled : palette.fg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      android_ripple={ripple(foreground)}
      style={[
        styles.base,
        flex && styles.flex,
        {
          // A label that does not fit on one line wraps and the button grows; a fixed height would cut the second line off.
          minHeight: height,
          paddingVertical: 8,
          paddingHorizontal: 24,
          borderRadius: height / 2,
          backgroundColor: background,
          borderWidth: variant === "outline" && !disabled ? 1 : 0,
          borderColor: palette.border,
        },
      ]}
    >
      {gradient ? <LinearGradient colors={gradient} {...horizontalGradient} style={StyleSheet.absoluteFill} /> : null}
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          <AppText variant={size === "lg" ? "bodyLg" : "body"} strong numberOfLines={2} style={{ color: foreground, flexShrink: 1, textAlign: "center" }}>
            {label}
          </AppText>
          {icon ? <Glyph source={icon} size={size === "lg" ? 20 : 18} color={foreground} /> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden" },
  flex: { flex: 1 },
});
