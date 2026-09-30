import { Card } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { formatPercent } from "@/format/format-amount";
import { formatSwapAmount } from "@/format/format-swap-amount";
import type { SwapQuote, SwapToken } from "@/types/swap";

const HIGH_IMPACT_BPS = 300;

type SwapDetailsCardProps = {
  quote: SwapQuote | null;
  receive: SwapToken;
  autoSlippage: boolean;
};

function formatSlippage(bps: number, auto: boolean) {
  const percent = formatPercent(bps, bps % 10 === 0 ? 1 : 2);
  return auto ? `Auto · ${percent}` : percent;
}

export function SwapDetailsCard({ quote, receive, autoSlippage }: SwapDetailsCardProps) {
  const impact = quote ? (quote.priceImpactBps === 0 ? "< 0.01%" : formatPercent(quote.priceImpactBps)) : "—";

  return (
    <Card>
      <DetailRow label="Price impact" value={impact} valueColor={quote && quote.priceImpactBps >= HIGH_IMPACT_BPS ? "negative" : "positive"} />
      <DetailRow
        label="Minimum received"
        value={quote ? `${formatSwapAmount(quote.minReceived, receive.decimals, receive.symbol)} ${receive.symbol}` : "—"}
      />
      <DetailRow label="Slippage" value={quote ? formatSlippage(quote.slippageBps, autoSlippage) : "—"} last />
    </Card>
  );
}
