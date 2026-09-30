import { formatPercent, formatToken, formatUsd } from "@/format/format-amount";
import type { AmountProblem, AmountQuote, EarnMarket } from "@/types/earn";

import { formatFullAmount } from "./earn-format";

export type AmountFormMode = "supply" | "withdraw";

export type AmountFormView = {
  mode: AmountFormMode;
  title: string;
  label: string;
  caption: string;
  error?: string;
  rows: readonly { label: string; value: string }[];
  note: string;
  cta: { label: string; disabled: boolean };
};

const COPY = {
  supply: { label: "Supply amount", caption: "Wallet", sharesRow: "You receive", idle: "Supply · approve in wallet", over: (symbol: string) => `Not enough ${symbol}` },
  withdraw: { label: "Withdraw amount", caption: "Supplied", sharesRow: "You burn", idle: "Withdraw · approve in wallet", over: () => "More than you supplied" },
} as const;

export function presentAmountForm(mode: AmountFormMode, market: EarnMarket, quote: AmountQuote, problem: AmountProblem | null): AmountFormView {
  const copy = COPY[mode];
  const limit = mode === "supply" ? market.walletBalance : market.supplied;
  const limitText = formatFullAmount(limit, market.symbol);
  const place = mode === "supply" ? "in your wallet" : "supplied";

  return {
    mode,
    title: `${market.symbol} vault`,
    label: copy.label,
    caption: `${copy.caption} ${limitText}`,
    error: problem === "insufficient" ? `You have ${limitText} ${place}. Lower the amount.` : undefined,
    rows: [
      { label: "Supply APY", value: formatPercent(market.supplyApyBps) },
      { label: copy.sharesRow, value: `${formatToken({ raw: quote.shares, decimals: market.decimals }, 2)} ${market.shareSymbol}` },
      { label: "Supplied after", value: formatFullAmount({ raw: quote.suppliedAfter, decimals: market.decimals }, market.symbol) },
      { label: "Projected yearly", value: `+${formatUsd(quote.projectedYearlyUsd)}` },
    ],
    note: `Supplied ${market.symbol} is lent to Vanna traders and farmers. You can withdraw anytime the vault has free liquidity.`,
    cta:
      problem === "empty"
        ? { label: "Enter an amount", disabled: true }
        : problem === "insufficient"
          ? { label: copy.over(market.symbol), disabled: true }
          : { label: copy.idle, disabled: false },
  };
}
