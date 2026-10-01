import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { formatPercent, formatToken, formatUnits } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { PerpsMarket } from "@/types/perps";

import { ExpandableNote } from "./expandable-note";

type MarketStatsProps = {
  market: PerpsMarket;
  liquidityTokens: bigint;
  liquidationNote: string;
};

function StatRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View
      style={{ height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.divider }}
    >
      <AppText variant="body" color="textMuted">
        {label}
      </AppText>
      <AppText variant="body" strong>
        {value}
      </AppText>
    </View>
  );
}

export function MarketStats({ market, liquidityTokens, liquidationNote }: MarketStatsProps) {
  const liquidity = `$${formatUnits(market.liquidityUsd, 6, 0)} · ${formatToken({ raw: liquidityTokens, decimals: 6 }, 0)} ${market.symbol}`;

  return (
    <>
      <StatRow label="Borrow APY" value={formatPercent(market.tokenBorrowBps)} />
      <StatRow label="USDC borrow APY" value={formatPercent(market.usdcBorrowBps)} />
      <StatRow label="Liquidity" value={liquidity} />
      <StatRow label="Max leverage" value={`${market.maxLeverage}x`} />
      <ExpandableNote title="How borrowing and liquidation work" body={liquidationNote} />
    </>
  );
}
