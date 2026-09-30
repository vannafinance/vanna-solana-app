import { Pressable, View } from "react-native";

import { AppText } from "./app-text";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <AppText variant="heading">{title}</AppText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={12}>
          <AppText variant="bodyLg" color="link" strong>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
