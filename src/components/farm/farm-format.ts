import { formatToken, formatUsd, type TokenAmount } from "@/format/format-amount";
import { health } from "@/theme/tokens";
import type { ThemeColor } from "@/theme/use-theme";
import type { DeployForm } from "@/types/farm";

export function formatAssetAmount(amount: TokenAmount, symbol: string): string {
  return formatToken(amount, symbol === "SOL" ? 3 : 2);
}

export function withSymbol(amount: TokenAmount, symbol: string): string {
  return `${formatAssetAmount(amount, symbol)} ${symbol}`;
}

export function formatHealth(healthFactor: number): string {
  return Number.isFinite(healthFactor) ? healthFactor.toFixed(2) : "∞";
}

export function healthColor(healthFactor: number): ThemeColor {
  if (healthFactor >= health.safeFrom) return "heroPositive";
  return healthFactor > health.liquidation ? "healthWatch" : "short";
}

export function healthLabel(healthFactor: number): string {
  if (healthFactor >= health.safeFrom) return "Safe";
  return healthFactor > health.liquidation ? "Moderate" : "At risk";
}

export function pairLabel(collateralSymbol: string, poolSymbol: string): string {
  return `${collateralSymbol} → ${poolSymbol}`;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function shortSignature(signature: string): string {
  return `${signature.slice(0, 4)}…${signature.slice(-4)}`;
}

export function formatBorrow({ pool, quote }: DeployForm): string {
  return withSymbol(quote.borrow, pool.symbol);
}

export function formatYearlyCaption({ pool, quote, amount }: DeployForm): string {
  if (amount.raw <= 0n) return "Enter an amount to see it in dollars";
  if (quote.healthFactor === null) return "Pick 2x or more to start earning";
  return `≈ ${formatUsd(quote.projectedYearlyUsd)} a year, paid in ${pool.symbol}`;
}

export function deployCtaLabel({ issue, collateral }: DeployForm, needsMarginAccount: boolean): string {
  switch (issue) {
    case "no-balance":
      return `No ${collateral.symbol} to deposit`;
    case "over-balance":
      return `Not enough ${collateral.symbol}`;
    case "no-amount":
      return "Enter an amount";
    case "low-leverage":
      return "Pick leverage above 1x";
    case "too-risky":
      return "Position too risky";
    case "pool-liquidity":
      return "Pool too small for this size";
    case null:
      return needsMarginAccount ? "Create margin account to deploy" : "Deploy strategy · approve in wallet";
  }
}
