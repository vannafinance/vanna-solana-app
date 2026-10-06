import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { TokenIcon } from "@/components/ui/token-icon";
import type { PerpsSymbol } from "@/types/perps";

type OrderMarketCardProps = {
  symbol: PerpsSymbol;
  pair: string;
  price: string;
};

// The market being traded: the pair on the left, its mark price on the right.
export function OrderMarketCard({ symbol, pair, price }: OrderMarketCardProps) {
  return (
    <Card padded={false}>
      <View accessible accessibilityLabel={`${pair}, mark price ${price}`} style={{ height: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
        <TokenIcon symbol={symbol} size={32} />
        <AppText variant="bodyLg" strong numberOfLines={1} style={{ flex: 1 }}>
          {pair}
        </AppText>
        <View style={{ alignItems: "flex-end" }}>
          <AppText variant="body" strong>
            {price}
          </AppText>
          <AppText variant="caption" color="textMuted">
            Mark price
          </AppText>
        </View>
      </View>
    </Card>
  );
}
