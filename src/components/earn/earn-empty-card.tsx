import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type EarnEmptyCardProps = {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function EarnEmptyCard({ title, message, actionLabel, onAction }: EarnEmptyCardProps) {
  return (
    <Card style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <AppText variant="bodyLg" strong>
          {title}
        </AppText>
        <AppText variant="body" color="textMuted">
          {message}
        </AppText>
      </View>
      <Button label={actionLabel} variant="dark" size="sm" onPress={onAction} />
    </Card>
  );
}
