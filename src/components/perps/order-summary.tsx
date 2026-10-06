import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatPercent, formatUsd } from "@/format/format-amount";
import { formatPrice } from "@/format/format-earn";
import { formatLiquidationPrice, formatOrderTokens } from "@/format/format-perps";
import type { OrderIssue, OrderQuote, PerpsMarket, Side } from "@/types/perps";

type OrderSummaryProps = {
  market: PerpsMarket;
  side: Side;
  quote: OrderQuote;
  issue: OrderIssue;
  liquidationHealth: number;
};

// What the order opens, as two strips: the position itself, then what it costs and what it leaves the account at.
export function OrderSummary({ market, side, quote, issue, liquidationHealth }: OrderSummaryProps) {
  const borrowBps = side === "long" ? market.usdcBorrowBps : market.tokenBorrowBps;
  const borrowAsset = side === "long" ? "USDC" : market.symbol;
  const health = Number.isFinite(quote.healthAfter) ? quote.healthAfter.toFixed(2) : "∞";
  const risky = issue === "health-low";

  return (
    <Card style={{ gap: 12 }}>
      <AppText variant="bodyLg" strong>
        Summary
      </AppText>
      <StatStrip
        stats={[
          { label: "Position size", value: formatUsd(quote.size), sub: formatOrderTokens(quote.tokens, market.symbol) },
          { label: "Entry price", value: formatPrice(market.markPrice) },
          { label: "Liq. price", value: formatLiquidationPrice(quote.liquidationPrice) },
        ]}
      />
      <StatStrip
        stats={[
          { label: "Borrow APY", value: formatPercent(borrowBps), sub: borrowAsset },
          { label: "Fees", value: formatUsd(quote.fee) },
          { label: "Health after", value: health, sub: `Liq. at ${liquidationHealth.toFixed(2)}`, valueColor: risky ? "negative" : "text" },
        ]}
      />
      {risky ? (
        <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 8 }}>
          <Icon name="info" size={16} color="negative" />
          <AppText variant="caption" color="negative" style={{ flex: 1 }}>
            {`Account health would drop to ${health}, close to liquidation at ${liquidationHealth.toFixed(2)}. Lower the leverage or the amount.`}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}
