import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/theme/use-theme";

type FaucetCardProps = {
  onOpen: () => void;
};

export function FaucetCard({ onOpen }: FaucetCardProps) {
  const { spacing } = useTheme();

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="body" strong>
          Test faucet
        </AppText>
        <AppText variant="caption" color="textMuted">
          Get SOL for fees plus USDC and stock tokens to try the app on the Vanna fork.
        </AppText>
      </View>
      <Button size="md" variant="tonal" label="Get test tokens" onPress={onOpen} />
    </Card>
  );
}
