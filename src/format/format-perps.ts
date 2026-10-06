import { formatUnits, formatUsd, formatToken, type TokenAmount } from "@/format/format-amount";
import type { PerpsSymbol, Side } from "@/types/perps";

const TOKEN_DECIMALS = 6;
const ONE_TOKEN = 10n ** BigInt(TOKEN_DECIMALS);

export function formatTokenSize(tokens: bigint, symbol: PerpsSymbol) {
  const digits = tokens >= ONE_TOKEN ? 2 : 4;
  return `${formatToken({ raw: tokens, decimals: TOKEN_DECIMALS }, digits)} ${symbol}`;
}

export function formatOrderTokens(tokens: bigint, symbol: PerpsSymbol) {
  return `${formatToken({ raw: tokens, decimals: TOKEN_DECIMALS }, 4)} ${symbol}`;
}

export function formatLiquidationPrice(price: bigint) {
  return price === 0n ? "None" : formatUsd(price);
}

export function sideLabel(side: Side) {
  return side === "long" ? "Long" : "Short";
}

export function formatHealth(health: number) {
  return Number.isFinite(health) ? health.toFixed(2) : "No debt";
}

// Up to six decimals with the trailing zeros dropped, the way the web app lists amounts in history: 9.804934 or 1,622.04.
export function formatActivityAmount({ raw, decimals }: TokenAmount): string {
  const text = formatUnits(raw, decimals, Math.min(decimals, 6));
  return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
}

// Chart axis labels for a figure that can be below zero: $0, $50, -$25, $1.2K.
export function formatAxisSignedUsd(dollars: number): string {
  const size = Math.abs(dollars);
  const text = size >= 1000 ? `$${(size / 1000).toFixed(size % 1000 ? 1 : 0)}K` : `$${size.toFixed(size % 1 ? 2 : 0)}`;
  return dollars < 0 ? `-${text}` : text;
}
