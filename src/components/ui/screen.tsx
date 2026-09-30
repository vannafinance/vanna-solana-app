import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/use-theme";

type ScreenProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function Screen({ header, footer, children }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {header}
        <View style={{ padding: spacing.lg, gap: spacing.lg }}>{children}</View>
      </ScrollView>
      {footer ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.lg) }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}
