import type { TokenAmount } from "@/format/format-amount";

export const USD_DECIMALS = 6;
export const BPS = 10_000n;

export function toUsd(amount: TokenAmount, priceUsd: bigint): bigint {
  return (amount.raw * priceUsd) / 10n ** BigInt(amount.decimals);
}

export function fromUsd(usd: bigint, priceUsd: bigint, decimals: number): TokenAmount {
  return { raw: (usd * 10n ** BigInt(decimals)) / priceUsd, decimals };
}

export function scaleAmount(amount: TokenAmount, numerator: bigint, denominator: bigint = BPS): TokenAmount {
  return { raw: (amount.raw * numerator) / denominator, decimals: amount.decimals };
}

export function sumAmounts(a: TokenAmount, b: TokenAmount): TokenAmount {
  return { raw: a.raw + b.raw, decimals: a.decimals };
}
