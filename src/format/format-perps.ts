import { formatToken, formatUsd } from "@/format/format-amount";
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
