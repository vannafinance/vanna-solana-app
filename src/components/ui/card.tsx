import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/use-theme";

type CardProps = {
  children: ReactNode;
  padded?: boolean;
  style?: ViewStyle;
};

export function Card({ children, padded = true, style }: CardProps) {
  const { colors, radius, spacing, scheme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: padded ? spacing.lg : 0,
          elevation: scheme === "light" ? 1 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
