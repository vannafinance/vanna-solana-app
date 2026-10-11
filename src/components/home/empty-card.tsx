import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/theme/use-theme";

type EmptyCardProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyCard({ title, message, actionLabel, onAction }: EmptyCardProps) {
  const { spacing } = useTheme();

  return (
    <Card>
      <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md }}>
        <AppText variant="title">{title}</AppText>
        <AppText variant="body" color="textMuted" style={{ textAlign: "center" }}>
          {message}
        </AppText>
        {actionLabel && onAction ? (
          <View style={{ marginTop: spacing.sm }}>
            <Button size="md" label={actionLabel} onPress={onAction} />
          </View>
        ) : null}
      </View>
    </Card>
  );
}
