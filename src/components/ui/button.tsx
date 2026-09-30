import type { Icon } from "phosphor-react-native";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

export type ButtonVariant = "primary" | "dark" | "outline" | "text" | "danger";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: Icon;
  size?: "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  flex?: boolean;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  icon: Glyph,
  size = "lg",
  loading = false,
  disabled = false,
  flex = false,
}: ButtonProps) {
  const { colors, radius, spacing, minTouchTarget } = useTheme();
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: "transparent" },
    dark: { bg: colors.chipActive, fg: colors.onChipActive, border: "transparent" },
    outline: { bg: "transparent", fg: colors.text, border: colors.border },
    text: { bg: "transparent", fg: colors.text, border: "transparent" },
    danger: { bg: colors.negative, fg: colors.onPrimary, border: "transparent" },
  }[variant];
  const background = disabled ? colors.disabled : palette.bg;
  const foreground = disabled ? colors.onDisabled : palette.fg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        flex && styles.flex,
        {
          minHeight: size === "lg" ? 56 : minTouchTarget,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.pill,
          backgroundColor: background,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: palette.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          <AppText variant={size === "lg" ? "bodyLg" : "body"} strong style={{ color: foreground }}>
            {label}
          </AppText>
          {Glyph ? <Glyph size={20} color={foreground} /> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  flex: { flex: 1 },
});
