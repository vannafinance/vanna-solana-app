import { Pressable } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { ripple } from "./ripple";

type QuickFillButtonProps = {
  label: string;
  onPress: () => void;
  selected?: boolean;
  flex?: boolean;
};

// The 25%, 50%, 75% and Max shortcuts under an amount. A clear outline that stays visible on a dark card, a 10 px corner rather than a
// pill, and a purple fill when it is the chosen share. It is 38 px tall with a taller touch area, so it stays easy to hit.
export function QuickFillButton({ label, onPress, selected = false, flex = false }: QuickFillButtonProps) {
  const { colors } = useTheme();
  const foreground = selected ? colors.onPurpleTint : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      android_ripple={ripple(colors.primary)}
      style={{
        flex: flex ? 1 : undefined,
        height: 38,
        minWidth: 56,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.borderControl,
        backgroundColor: selected ? colors.purpleTint : "transparent",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <AppText variant="body" strong style={{ color: foreground }}>
        {label}
      </AppText>
    </Pressable>
  );
}
