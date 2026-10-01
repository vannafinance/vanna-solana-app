import { Pressable } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { ripple } from "./ripple";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  flex?: boolean;
  check?: boolean;
  shape?: "chip" | "pill";
  size?: "sm" | "md";
};

export function Chip({ label, selected = false, onPress, flex = false, check = false, shape = "chip", size = "md" }: ChipProps) {
  const { colors, radius } = useTheme();
  const pill = shape === "pill";
  const height = pill ? 44 : 32;
  const foreground = selected ? colors.onPurpleTint : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={pill ? undefined : { top: 6, bottom: 6 }}
      android_ripple={ripple(foreground)}
      style={{
        flex: flex ? 1 : undefined,
        height,
        flexDirection: "row",
        gap: 6,
        paddingHorizontal: pill ? 16 : size === "sm" ? 12 : 16,
        borderRadius: pill ? height / 2 : radius.chip,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: selected ? colors.purpleTint : "transparent",
        borderWidth: 1,
        borderColor: selected ? colors.purpleTint : colors.border,
      }}
    >
      {check && selected ? <Icon name="check" size={16} color={foreground} /> : null}
      <AppText variant={size === "sm" ? "caption" : "body"} strong style={{ color: foreground }}>
        {label}
      </AppText>
    </Pressable>
  );
}
