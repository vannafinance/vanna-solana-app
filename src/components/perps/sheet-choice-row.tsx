import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";

type Choice = { label: string; selected: boolean; onPress: () => void };

type SheetChoiceRowProps = {
  choices: readonly Choice[];
  selectedTone: "tint" | "primary";
};

export function SheetChoiceRow({ choices, selectedTone }: SheetChoiceRowProps) {
  const { colors, radius } = useTheme();
  const fill = selectedTone === "tint" ? colors.purpleTint : colors.primary;
  const onFill = selectedTone === "tint" ? colors.onPurpleTint : colors.onPrimary;

  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
      {choices.map((choice) => (
        <Pressable
          key={choice.label}
          accessibilityRole="button"
          accessibilityLabel={choice.label}
          accessibilityState={{ selected: choice.selected }}
          android_ripple={ripple(choice.selected ? onFill : colors.text)}
          onPress={choice.onPress}
          style={{
            flex: 1,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.md,
            overflow: "hidden",
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
