import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatPercent, formatToken, formatUnits } from "@/format/format-amount";
import type { PerpsMarket } from "@/types/perps";

import { ExpandableNote } from "./expandable-note";

type MarketStatsProps = {
  market: PerpsMarket;
  liquidityTokens: bigint;
  liquidationNote: string;
};

const KIND_LABEL: Record<PerpsMarket["kind"], string> = { xStocks: "xStock", PreStocks: "PreStock", Crypto: "Token" };

// What the market costs and how much it can fill, as one card: title row, the four figures as a 2×2 strip, then the note.
export function MarketStats({ market, liquidityTokens, liquidationNote }: MarketStatsProps) {
  return (
    <Card style={{ gap: 12, paddingBottom: 0 }}>
      <View style={{ height: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="bodyLg" strong>
          Market
        </AppText>
        <AppText variant="caption" color="textMuted">
          {KIND_LABEL[market.kind]}
        </AppText>
      </View>
      <StatStrip
        stats={[
          { label: "Borrow APY", value: formatPercent(market.tokenBorrowBps), sub: `Borrowing ${market.symbol}` },
          { label: "USDC borrow APY", value: formatPercent(market.usdcBorrowBps), sub: "Borrowing USDC" },
          { label: "Liquidity", value: `$${formatUnits(market.liquidityUsd, 6, 0)}`, sub: `${formatToken({ raw: liquidityTokens, decimals: 6 }, 0)} ${market.symbol}` },
          { label: "Max leverage", value: `${market.maxLeverage}x` },
        ]}
      />
      <ExpandableNote title="How borrowing and liquidation work" body={liquidationNote} />
    </Card>
  );
}
