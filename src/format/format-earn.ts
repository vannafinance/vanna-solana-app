import { type TokenAmount, formatToken, formatUnits } from "@/format/format-amount";
import type { EarnAsset } from "@/types/earn";

const SUMMARY_DIGITS: Record<EarnAsset, number> = {
  USDC: 0,
  SOL: 2,
  TSLAx: 4,
  GOOGLx: 4,
  AAPLx: 4,
  ANTHROPIC: 2,
  OPENAI: 2,
  // About two cents a token, so whole tokens are precise enough.
  SKR: 0,
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DAY_MS = 86_400_000;
const USD_SCALE = 1_000_000;

export function formatChartDate(at: number, context: "axis" | "head", stepMs: number, now: number): string {
  const date = new Date(at);
  const day = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  if (context === "axis") return day;
  if (at >= now) return `Today, ${day}`;
  if (stepMs < DAY_MS) return `${day}, ${String(date.getUTCHours()).padStart(2, "0")}:00`;
  return `${day} ${date.getUTCFullYear()}`;
}

export function usdToDollars(raw: bigint): number {
  return Number(raw) / USD_SCALE;
}

export function formatAxisUsd(dollars: number): string {
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(dollars % 1000 ? 1 : 0)}K`;
  return `$${dollars.toFixed(dollars % 1 ? 2 : 0)}`;
}

export function formatAxisPercent(percent: number, step: number): string {
  const digits = Math.max(0, Math.min(3, -Math.floor(Math.log10(step) + 1e-9)));
  return `${percent.toFixed(digits)}%`;
}

export function formatRatePercent(percent: number): string {
  return `${percent.toFixed(2)}%`;
}

export function formatPrice(priceUsd: bigint): string {
  const dollars = Number(priceUsd) / USD_SCALE;
  return `$${formatUnits(priceUsd, 6, dollars >= 1 ? 2 : 4)}`;
}

export function formatExchangeRate(rate: bigint): string {
  return formatUnits(rate, 6, 6);
}

export function formatBonus(bps: number): string {
  return `${Number((bps / 100).toFixed(2))}% bonus`;
}
