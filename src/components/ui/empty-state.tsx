import type { ReactNode } from "react";
import { View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

type EmptyStateProps = {
  art: ReactNode;
  title: string;
  message: string;
};

// A page with nothing to list yet: some artwork, what this page is for, and what will show up in it.
export function EmptyState({ art, title, message }: EmptyStateProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl }}>
      <View style={{ marginBottom: spacing.sm }}>{art}</View>
      <AppText variant="title">{title}</AppText>
      <AppText variant="body" color="textMuted" style={{ textAlign: "center" }}>
        {message}
      </AppText>
    </View>
  );
}
