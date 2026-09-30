import { Pressable } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  flex?: boolean;
};

export function Chip({ label, selected = false, onPress, flex = false }: ChipProps) {
  const { colors, radius, spacing, minTouchTarget } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flex: flex ? 1 : undefined,
        minHeight: minTouchTarget,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? colors.chipActive : "transparent",
        borderWidth: 1,
        borderColor: selected ? colors.chipActive : colors.border,
      }}
    >
      <AppText variant="body" strong={selected} style={{ color: selected ? colors.onChipActive : colors.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}
