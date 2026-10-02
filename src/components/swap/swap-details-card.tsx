import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { formatSlippage, formatPriceImpact, formatSwapAmount } from "@/format/format-swap-amount";
import { type ThemeColor, useTheme } from "@/theme/use-theme";
import type { SwapQuote, SwapToken } from "@/types/swap";

const HIGH_IMPACT_BPS = 300;

type SwapDetailsCardProps = {
  quote: SwapQuote | null;
  receive: SwapToken;
  autoSlippage: boolean;
};

function Row({ label, value, color = "text", first = false }: { label: string; value: string; color?: ThemeColor; first?: boolean }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        height: 44,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <AppText variant="body" color="textMuted">
        {label}
      </AppText>
      <AppText variant="body" strong color={color}>
        {value}
      </AppText>
    </View>
  );
}

export function SwapDetailsCard({ quote, receive, autoSlippage }: SwapDetailsCardProps) {
  const impact = quote ? formatPriceImpact(quote.priceImpactBps) : "—";

  return (
    <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
      <Row first label="Price impact" value={impact} color={quote && quote.priceImpactBps >= HIGH_IMPACT_BPS ? "negative" : "positive"} />
      <Row label="Minimum received" value={quote ? `${formatSwapAmount(quote.minReceived, receive.decimals, receive.symbol)} ${receive.symbol}` : "—"} />
      <Row label="Slippage" value={quote ? formatSlippage(quote.slippageBps, autoSlippage) : "—"} />
    </Card>
  );
}
