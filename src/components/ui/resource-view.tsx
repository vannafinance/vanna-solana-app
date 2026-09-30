import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/use-theme";
import type { Resource } from "@/types/resource";

import { Button } from "./button";

type ResourceViewProps<T> = {
  resource: Resource<T>;
  emptyLabel: string;
  children: (data: T) => ReactNode;
};

export function ResourceView<T>({ resource, emptyLabel, children }: ResourceViewProps<T>) {
  const { colors, spacing, fontSize } = useTheme();

  if (resource.status === "ready") return <>{children(resource.data)}</>;

  return (
    <View style={[styles.center, { padding: spacing.xl, gap: spacing.lg }]}>
      {resource.status === "loading" && <ActivityIndicator accessibilityLabel="Loading" color={colors.text} />}
      {resource.status === "empty" && (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>{emptyLabel}</Text>
      )}
      {resource.status === "error" && (
        <>
          <Text style={{ color: colors.negative, fontSize: fontSize.body }}>{resource.error.message}</Text>
          <Button label="Retry" variant="outline" onPress={resource.retry} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
