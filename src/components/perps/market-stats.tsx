import { DetailRow } from "@/components/ui/detail-row";
import { formatPercent, formatToken, formatUnits } from "@/format/format-amount";
import type { PerpsMarket } from "@/types/perps";

import { ExpandableNote } from "./expandable-note";

type MarketStatsProps = {
  market: PerpsMarket;
  liquidityTokens: bigint;
  liquidationNote: string;
};

export function MarketStats({ market, liquidityTokens, liquidationNote }: MarketStatsProps) {
  const liquidity = `$${formatUnits(market.liquidityUsd, 6, 0)} · ${formatToken({ raw: liquidityTokens, decimals: 6 }, 0)} ${market.symbol}`;

  return (
    <>
      <DetailRow label="Borrow APY" value={formatPercent(market.tokenBorrowBps)} />
      <DetailRow label="USDC borrow APY" value={formatPercent(market.usdcBorrowBps)} />
      <DetailRow label="Liquidity" value={liquidity} />
      <DetailRow label="Max leverage" value={`${market.maxLeverage}x`} />
      <ExpandableNote title="How borrowing and liquidation work" body={liquidationNote} />
    </>
  );
}
