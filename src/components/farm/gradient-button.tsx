import type { Icon } from "phosphor-react-native";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type GradientButtonProps = {
  label: string;
  onPress: () => void;
  icon?: Icon;
  disabled?: boolean;
};

export function GradientButton({ label, onPress, icon: Glyph, disabled = false }: GradientButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const foreground = disabled ? colors.onDisabled : colors.onPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ borderRadius: radius.pill, overflow: "hidden", opacity: pressed ? 0.85 : 1 })}
    >
      <LinearGradient
        colors={disabled ? [colors.disabled, colors.disabled] : [colors.short, colors.primary]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ minHeight: 56, paddingHorizontal: spacing.xl, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm }}
      >
        <AppText variant="bodyLg" strong style={{ color: foreground }}>
          {label}
        </AppText>
        {Glyph ? (
          <View>
            <Glyph size={18} color={foreground} weight="fill" />
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}
