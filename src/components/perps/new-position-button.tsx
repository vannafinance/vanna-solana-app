import { Plus } from "phosphor-react-native";
import { Pressable } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type NewPositionButtonProps = { onPress: () => void };

export function NewPositionButton({ onPress }: NewPositionButtonProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open a new position"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Plus size={18} color={colors.text} />
      <AppText variant="body" strong>
        Open a new position
      </AppText>
    </Pressable>
  );
}
