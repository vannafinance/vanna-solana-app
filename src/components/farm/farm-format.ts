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
  if (healthFactor >= health.safeFrom) return "positive";
  return healthFactor > health.liquidation ? "warning" : "negative";
}

export function formatYearlyProfit(usd: bigint): string {
  return `≈${formatUsd(usd).replace(/\.00$/, "")}/yr`;
}

export function pairLabel(collateralSymbol: string, poolSymbol: string): string {
  return `${collateralSymbol} → ${poolSymbol}`;
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
    case null:
      return needsMarginAccount ? "Create margin account to deploy" : "Deploy strategy · approve in wallet";
  }
}
