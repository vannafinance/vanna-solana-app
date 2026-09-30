import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type Choice = { label: string; selected: boolean; onPress: () => void };

type SheetChoiceRowProps = {
  choices: readonly Choice[];
  selectedTone: "dark" | "primary";
};

export function SheetChoiceRow({ choices, selectedTone }: SheetChoiceRowProps) {
  const { colors, radius, spacing } = useTheme();
  const fill = selectedTone === "dark" ? colors.chipActive : colors.primary;
  const onFill = selectedTone === "dark" ? colors.onChipActive : colors.onPrimary;

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {choices.map((choice) => (
        <Pressable
          key={choice.label}
          accessibilityRole="button"
          accessibilityLabel={choice.label}
          accessibilityState={{ selected: choice.selected }}
          onPress={choice.onPress}
          style={{
            flex: 1,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.md,
            backgroundColor: choice.selected ? fill : colors.background,
          }}
        >
          <AppText variant="bodyLg" strong style={{ color: choice.selected ? onFill : colors.text }}>
            {choice.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
