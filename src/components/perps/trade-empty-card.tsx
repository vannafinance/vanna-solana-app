import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// The Positions page before the first margin trade: no chart of zeros, just what to do.
export function TradeEmptyCard({ onBrowse }: { onBrowse: () => void }) {
  return (
    <Card style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <AppText variant="bodyLg" strong>
          No margin trades yet
        </AppText>
        <AppText variant="body" color="textMuted">
          Go long or short on a market and your earnings show up here.
        </AppText>
      </View>
      <Button label="Browse markets" variant="dark" size="sm" onPress={onBrowse} />
    </Card>
  );
}
