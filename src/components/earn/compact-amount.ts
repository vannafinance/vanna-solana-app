import { type TokenAmount, formatToken } from "@/format/format-amount";

// A token amount short enough for a narrow column: "59.0K", "1.2M", "2,501", "1.50", "0.0421". Display only: precision
// above 2^53 base units is irrelevant at K/M granularity.
export function formatCompactToken(amount: TokenAmount): string {
  const value = Number(amount.raw) / 10 ** amount.decimals;
  if (value >= 999_950) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  if (value >= 1_000) return formatToken(amount, 0);
  if (value >= 1) return formatToken(amount, 2);
  return amount.raw === 0n ? "0" : formatToken(amount, 4);
}
