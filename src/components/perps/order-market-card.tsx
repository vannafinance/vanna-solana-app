import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { TokenIcon } from "@/components/ui/token-icon";
import type { PerpsSymbol } from "@/types/perps";
import { useTheme } from "@/theme/use-theme";

type OrderMarketCardProps = {
  symbol: PerpsSymbol;
  pair: string;
  price: string;
};

export function OrderMarketCard({ symbol, pair, price }: OrderMarketCardProps) {
  const { spacing } = useTheme();

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <TokenIcon symbol={symbol} size={32} />
        <AppText variant="bodyLg" strong style={{ flex: 1 }}>
          {pair}
        </AppText>
        <AppText variant="bodyLg" strong>
          {price}
        </AppText>
      </View>
    </Card>
  );
}
