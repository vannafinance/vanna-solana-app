import type { AmountQuote, EarnMarket } from "@/types/earn";

import { projectedYearlyUsd, sharesForAssets } from "./share-math";

export function quoteSupply(market: EarnMarket, amount: bigint): AmountQuote {
  const suppliedAfter = market.supplied.raw + amount;
  return {
    shares: sharesForAssets(amount, market.shareExchangeRate),
    suppliedAfter,
    projectedYearlyUsd: projectedYearlyUsd(suppliedAfter, market.decimals, market.priceUsd, market.supplyApyBps),
  };
}

export function quoteWithdraw(market: EarnMarket, amount: bigint): AmountQuote {
  const suppliedAfter = market.supplied.raw > amount ? market.supplied.raw - amount : 0n;
  return {
    shares: sharesForAssets(amount, market.shareExchangeRate),
    suppliedAfter,
    projectedYearlyUsd: projectedYearlyUsd(suppliedAfter, market.decimals, market.priceUsd, market.supplyApyBps),
  };
}
