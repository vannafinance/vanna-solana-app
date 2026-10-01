import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { TokenIcon } from "@/components/ui/token-icon";
import type { PerpsSymbol } from "@/types/perps";

type OrderMarketCardProps = {
  symbol: PerpsSymbol;
  pair: string;
};

export function OrderMarketCard({ symbol, pair }: OrderMarketCardProps) {
  return (
    <Card padded={false}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
        <TokenIcon symbol={symbol} size={32} />
        <AppText variant="body" strong style={{ flex: 1 }}>
          {pair}
        </AppText>
      </View>
    </Card>
  );
}
