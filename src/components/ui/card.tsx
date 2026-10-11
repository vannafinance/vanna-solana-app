import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/use-theme";

type CardProps = {
  children: ReactNode;
  padded?: boolean;
  tone?: "card" | "inset";
  style?: ViewStyle;
};

export function Card({ children, padded = true, tone = "card", style }: CardProps) {
  const { colors, radius, shadow, spacing } = useTheme();
  const inset = tone === "inset";

  return (
    <View
      style={[
        {
          backgroundColor: inset ? colors.background : colors.surface,
          borderRadius: inset ? radius.sm : radius.md,
          padding: padded ? spacing.lg : 0,
        },
        inset ? null : shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
