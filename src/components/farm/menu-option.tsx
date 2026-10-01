import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ripple } from "@/components/ui/ripple";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

type MenuOptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon: ReactNode;
  height: number;
  labelColor?: ThemeColor;
  trailing: ReactNode;
};

export function MenuOption({ label, selected, onPress, icon, height, labelColor = "text", trailing }: MenuOptionProps) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      android_ripple={ripple(colors.text)}
      style={{
        height,
        paddingHorizontal: 10,
        borderRadius: radius.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        overflow: "hidden",
        backgroundColor: selected ? colors.purpleTint : "transparent",
      }}
    >
      {icon}
      <AppText variant="bodyLg" strong color={labelColor} style={{ flex: 1, fontSize: 15 }}>
        {label}
      </AppText>
      <View style={{ alignItems: "flex-end" }}>{trailing}</View>
    </Pressable>
  );
}
