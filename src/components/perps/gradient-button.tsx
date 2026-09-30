import { LinearGradient } from "expo-linear-gradient";
import { Pressable } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type GradientButtonProps = {
  label: string;
  onPress: () => void;
};

export function GradientButton({ label, onPress }: GradientButtonProps) {
  const { colors, radius } = useTheme();

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <LinearGradient
        colors={[colors.short, colors.primary]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ minHeight: 56, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" }}
      >
        <AppText variant="bodyLg" strong color="onPrimary">
          {label}
        </AppText>
      </LinearGradient>
    </Pressable>
  );
}
