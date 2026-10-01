import { formatSignedPercent, formatSignedUsd, formatToken, type TokenAmount } from "@/format/format-amount";
import { health } from "@/theme/tokens";
import type { ThemeColor } from "@/theme/use-theme";
import type { PositionSide } from "@/types/portfolio";

const PRECISE_SYMBOLS: readonly string[] = ["OPENAI"];

export function pnlColor(pnl: bigint): ThemeColor {
  if (pnl === 0n) return "textMuted";
  return pnl > 0n ? "positive" : "negative";
}

export function pnlText(pnl: bigint, bps: number) {
  return { amount: formatSignedUsd(pnl), percent: formatSignedPercent(bps) };
}

export function sideColor(side: PositionSide | undefined): ThemeColor {
  if (side === "long") return "link";
  return side === "short" ? "negative" : "textMuted";
}

export function sideLabel(side: PositionSide | undefined, leverage: number) {
  const kind = side === "long" ? "Long" : side === "short" ? "Short" : "Farm";
  return `${kind} ${leverage}x`;
}

export function tokenText(amount: TokenAmount, symbol: string) {
  return `${formatToken(amount, PRECISE_SYMBOLS.includes(symbol) ? 4 : 2)} ${symbol}`;
}

export function healthLabel(value: number) {
  if (value >= health.safeFrom) return "Safe";
  return value >= health.liquidation ? "Watch" : "At risk";
}

export function healthColor(value: number): ThemeColor {
  if (value >= health.safeFrom) return "positive";
  return value >= health.liquidation ? "healthWatch" : "negative";
}
