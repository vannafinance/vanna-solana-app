import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { Icon } from "@/components/ui/icon";
import { formatPercent, formatUsd } from "@/format/format-amount";
import { formatLiquidationPrice, formatOrderTokens } from "@/format/format-perps";
import type { OrderIssue, OrderQuote, PerpsMarket, Side } from "@/types/perps";

type OrderSummaryProps = {
  market: PerpsMarket;
  side: Side;
  quote: OrderQuote;
  issue: OrderIssue;
  liquidationHealth: number;
};

export function OrderSummary({ market, side, quote, issue, liquidationHealth }: OrderSummaryProps) {
  const borrowCost =
    side === "long"
      ? `${formatPercent(market.usdcBorrowBps)} USDC APY`
      : `${formatPercent(market.tokenBorrowBps)} ${market.symbol} APY`;
  const health = quote.healthAfter.toFixed(2);
  const risky = issue === "health-low";
  const tone = risky ? "negative" : "textMuted";

  return (
    <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
      <DetailRow label="Position size" value={`${formatUsd(quote.size)} · ${formatOrderTokens(quote.tokens, market.symbol)}`} />
      <DetailRow label="Entry price" value={formatUsd(market.markPrice)} />
      <DetailRow label="Liquidation price" value={formatLiquidationPrice(quote.liquidationPrice)} />
      <DetailRow label="Borrow cost" value={borrowCost} />
      <DetailRow label="Fees" value={formatUsd(quote.fee)} />
      <View accessibilityRole={risky ? "alert" : undefined} style={{ flexDirection: "row", gap: 8, paddingVertical: 12 }}>
        <Icon name="info" size={16} color={tone} />
        <AppText variant="caption" color={tone} style={{ flex: 1 }}>
          {risky
            ? `Account health would drop to ${health}, close to liquidation at ${liquidationHealth.toFixed(2)}. Lower the leverage or the amount.`
            : `After this trade your account health is ${health}. Liquidation happens at ${liquidationHealth.toFixed(2)}.`}
        </AppText>
      </View>
    </Card>
  );
}
