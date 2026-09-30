import { Card } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { Notice } from "@/components/ui/notice";
import { formatPercent, formatUsd } from "@/format/format-amount";
import type { OrderIssue, OrderQuote, PerpsMarket, Side } from "@/types/perps";

import { formatLiquidationPrice, formatOrderTokens } from "./format-perps";

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

  return (
    <Card>
      <DetailRow label="Position size" value={`${formatUsd(quote.size)} · ${formatOrderTokens(quote.tokens, market.symbol)}`} />
      <DetailRow label="Entry price" value={formatUsd(market.markPrice)} />
      <DetailRow label="Liquidation price" value={formatLiquidationPrice(quote.liquidationPrice)} />
      <DetailRow label="Borrow cost" value={borrowCost} />
      <DetailRow label="Fees" value={formatUsd(quote.fee)} />
      <Notice
        tone={risky ? "error" : "info"}
        message={
          risky
            ? `Account health would drop to ${health}, close to liquidation at ${liquidationHealth.toFixed(2)}. Lower the leverage or the amount.`
            : `After this trade your account health is ${health}. Liquidation happens at ${liquidationHealth.toFixed(2)}.`
        }
      />
    </Card>
  );
}
