import { CaretDown, CaretUp } from "phosphor-react-native";
import { Pressable } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type RouteChipProps = {
  label: string;
  open: boolean;
  onPress: () => void;
};

export function RouteChip({ label, open, onPress }: RouteChipProps) {
  const { colors, radius, spacing, minTouchTarget } = useTheme();
  const Caret = open ? CaretUp : CaretDown;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Swap route, via ${label}`}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        minHeight: minTouchTarget,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: open ? colors.primary : colors.border,
      }}
    >
      <AppText variant="bodyLg" color="textMuted">
        via
      </AppText>
      <AppText variant="bodyLg" strong>
        {label}
      </AppText>
      <Caret size={16} color={colors.text} />
    </Pressable>
  );
}
