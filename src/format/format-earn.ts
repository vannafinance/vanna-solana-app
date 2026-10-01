import { type TokenAmount, formatToken } from "@/format/format-amount";
import type { EarnAsset } from "@/types/earn";

const SUMMARY_DIGITS: Record<EarnAsset, number> = {
  USDC: 0,
  SOL: 2,
  TSLAx: 4,
  GOOGLx: 4,
  AAPLx: 4,
  ANTHROPIC: 2,
  OPENAI: 2,
};

export function formatSummaryNumber(amount: TokenAmount, symbol: EarnAsset): string {
  return formatToken(amount, SUMMARY_DIGITS[symbol]);
}

export function formatSummaryAmount(amount: TokenAmount, symbol: EarnAsset): string {
  return `${formatSummaryNumber(amount, symbol)} ${symbol}`;
}

export function formatFullAmount(amount: TokenAmount, symbol: string): string {
  return `${formatToken(amount, 2)} ${symbol}`;
}

export function formatEarnedAmount(amount: TokenAmount, symbol: EarnAsset): string {
  return `${formatToken(amount, symbol === "USDC" ? 2 : 4)} ${symbol}`;
}
