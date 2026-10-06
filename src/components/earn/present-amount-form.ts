import { formatPercent, formatToken, formatUsd } from "@/format/format-amount";
import { formatFullAmount } from "@/format/format-earn";
import type { AmountProblem, AmountQuote, EarnMarket } from "@/types/earn";

export type AmountFormMode = "supply" | "withdraw";

export type AmountFormView = {
  mode: AmountFormMode;
  title: string;
  label: string;
  caption: string;
  over: boolean;
  rows: readonly { label: string; value: string }[];
  note: string;
  cta: { label: string; disabled: boolean };
};

const COPY = {
  supply: { label: "Supply amount", caption: "Wallet", sharesRow: "You receive", idle: "Supply", over: (symbol: string) => `Not enough ${symbol}` },
  withdraw: { label: "Withdraw amount", caption: "Supplied", sharesRow: "You burn", idle: "Withdraw", over: () => "More than you supplied" },
} as const;

export function presentAmountForm(mode: AmountFormMode, market: EarnMarket, quote: AmountQuote, problem: AmountProblem | null): AmountFormView {
  const copy = COPY[mode];
  const limit = mode === "supply" ? market.walletBalance : market.supplied;

  return {
    mode,
    title: `${market.symbol} vault`,
    label: copy.label,
    caption: `${copy.caption} ${formatFullAmount(limit, market.symbol)}`,
    over: problem === "insufficient",
    rows: [
      { label: "Supply APY", value: formatPercent(market.supplyApyBps) },
      { label: copy.sharesRow, value: `${formatToken({ raw: quote.shares, decimals: market.decimals }, 2)} ${market.shareSymbol}` },
      { label: "Supplied after", value: formatFullAmount({ raw: quote.suppliedAfter, decimals: market.decimals }, market.symbol) },
      { label: "Projected yearly", value: `+${formatUsd(quote.projectedYearlyUsd)}` },
    ],
    note: `Supplied ${market.symbol} is lent to Vanna traders and farmers. You can withdraw any time the vault has free liquidity.`,
    cta:
      problem === "empty"
        ? { label: "Enter an amount", disabled: true }
        : problem === "insufficient"
          ? { label: copy.over(market.symbol), disabled: true }
          : { label: `${copy.idle} ${market.symbol}`, disabled: false },
  };
}
