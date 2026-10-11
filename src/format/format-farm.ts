import { formatSignedPercent, formatSignedUsd, formatToken, type TokenAmount } from "@/format/format-amount";
import { formatAxisUsd } from "@/format/format-earn";
import type { DeployForm } from "@/types/farm";

export const DASH = "—";

// The same thresholds as the theme's health colours, for the words that go with them: liquidation at 1.10, safe from 1.50.
export const FARM_HEALTH = { liquidation: 1.1, safeFrom: 1.5 } as const;

export function formatAssetAmount(amount: TokenAmount, symbol: string): string {
  return formatToken(amount, symbol === "SOL" ? 3 : 2);
}

export function withSymbol(amount: TokenAmount, symbol: string): string {
  return `${formatAssetAmount(amount, symbol)} ${symbol}`;
}

// A pool's size reads better as "1.2M USDC" than to the cent.
export function compactTokens(amount: TokenAmount, symbol: string): string {
  const value = Number(amount.raw) / 10 ** amount.decimals;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ${symbol}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K ${symbol}`;
  return withSymbol(amount, symbol);
}

// Infinity means nothing is owed.
export function formatHealth(healthFactor: number): string {
  return Number.isFinite(healthFactor) ? healthFactor.toFixed(2) : "No debt";
}

export function healthLabel(healthFactor: number): string {
  if (healthFactor >= FARM_HEALTH.safeFrom) return "Safe";
  return healthFactor > FARM_HEALTH.liquidation ? "Watch" : "At risk";
}

// "1.42 · Watch", or "No debt" when nothing is borrowed.
export function healthText(healthFactor: number | null): string {
  if (healthFactor === null || !Number.isFinite(healthFactor)) return "No debt";
  return `${healthFactor.toFixed(2)} · ${healthLabel(healthFactor)}`;
}

// A figure that changes: "1.60 to 1.42", or just the new figure when there is nothing to compare it with.
export function nowToAfter(now: string | null, after: string): string {
  return now === null || now === after ? after : `${now} to ${after}`;
}

export function yearlyText(yearlyUsd: bigint): string {
  return `${formatSignedUsd(yearlyUsd)} a year`;
}

export function onDepositText(netApyBps: number): string {
  return `${formatSignedPercent(netApyBps)} on your deposit`;
}

export function pairLabel(collateralSymbol: string, poolSymbol: string): string {
  return `${collateralSymbol} · ${poolSymbol}`;
}

// "Oct 4, 2026, 2:15 PM".
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

export function shortSignature(signature: string): string {
  return `${signature.slice(0, 4)}…${signature.slice(-4)}`;
}

// The footer button says why it cannot be pressed.
export function deployCtaLabel({ issue, collateral }: DeployForm, needsMarginAccount: boolean): string {
  switch (issue) {
    case "no-balance":
      return `No ${collateral.symbol} in your wallet`;
    case "over-balance":
      return `Not enough ${collateral.symbol}`;
    case "no-amount":
      return "Enter an amount";
    case "low-leverage":
      return "Pick leverage above 1x";
    case "too-risky":
      return "Too close to liquidation";
    case "pool-liquidity":
      return "Pool too small for this size";
    case null:
      return needsMarginAccount ? "Create margin account to deploy" : "Deploy strategy";
  }
}

// A chart axis that can go below zero: "-$2" rather than "$-2".
export function formatAxisSignedUsd(dollars: number): string {
  return dollars < 0 ? `-${formatAxisUsd(-dollars)}` : formatAxisUsd(dollars);
}
