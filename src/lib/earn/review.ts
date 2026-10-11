import { formatPercent, formatToken, formatUsd } from "@/format/format-amount";
import { formatFullAmount } from "@/format/format-earn";
import { NETWORK_FEE_ESTIMATE, NETWORK_LABEL } from "@/lib/solana/config";
import type { AmountQuote, EarnMarket } from "@/types/earn";
import type { ReviewData } from "@/types/review";

type EarnReviewInput = {
  mode: "supply" | "withdraw";
  market: EarnMarket;
  quote: AmountQuote;
  amount: bigint;
  wallet: { name: string; address: string };
};

// What a supply or a withdrawal does, shown before the wallet is asked to sign it.
export function buildEarnReview({ mode, market, quote, amount, wallet }: EarnReviewInput): ReviewData {
  const supplying = mode === "supply";
  const valueUsd = (amount * market.priceUsd) / 10n ** BigInt(market.decimals);

  return {
    title: supplying ? "Review supply" : "Review withdrawal",
    legs: [
      { label: supplying ? "You supply" : "You withdraw", value: `${formatToken({ raw: amount, decimals: market.decimals }, 2)} ${market.symbol}`, caption: `≈ ${formatUsd(valueUsd)}` },
      {
        label: supplying ? "You receive" : "You burn",
        value: `${formatToken({ raw: quote.shares, decimals: market.decimals }, 2)} ${market.shareSymbol}`,
        caption: supplying ? "Vault shares that earn the supply rate" : "Vault shares redeemed for the amount above",
      },
    ],
    rows: [
      { label: "Supply APY", value: formatPercent(market.supplyApyBps) },
      { label: "Supplied after", value: formatFullAmount({ raw: quote.suppliedAfter, decimals: market.decimals }, market.symbol) },
      { label: "Projected yearly", value: `+${formatUsd(quote.projectedYearlyUsd)}`, tone: "positive" },
      { label: "Network fee", value: NETWORK_FEE_ESTIMATE },
    ],
    wallet,
    network: NETWORK_LABEL,
    confirmLabel: supplying ? "Confirm supply" : "Confirm withdrawal",
  };
}
