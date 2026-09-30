import { Pressable } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { brand, palette, radius } from "@/theme/tokens";

type DarkButtonProps = {
  label: string;
  onPress: () => void;
};

export function DarkButton({ label, onPress }: DarkButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.dark.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <AppText variant="bodyLg" strong style={{ color: brand.onHero }}>
        {label}
      </AppText>
    </Pressable>
  );
}
