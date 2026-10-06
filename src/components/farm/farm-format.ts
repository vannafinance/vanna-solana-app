import { health } from "@/theme/tokens";
import type { ThemeColor } from "@/theme/use-theme";

export {
  compactTokens,
  DASH,
  deployCtaLabel,
  formatAssetAmount,
  formatAxisSignedUsd,
  formatHealth,
  formatTimestamp,
  healthLabel,
  healthText,
  nowToAfter,
  onDepositText,
  pairLabel,
  shortSignature,
  withSymbol,
  yearlyText,
} from "@/format/format-farm";

// For figures on the coloured header.
export function healthColor(healthFactor: number): ThemeColor {
  if (healthFactor >= health.safeFrom) return "heroPositive";
  return healthFactor > health.liquidation ? "healthWatch" : "short";
}

// For figures on a card. Null means nothing is owed.
export function healthDotColor(healthFactor: number | null): ThemeColor {
  if (healthFactor === null || healthFactor >= health.safeFrom) return "positive";
  return healthFactor > health.liquidation ? "healthWatch" : "negative";
}

export function signedTone(value: bigint | number): ThemeColor {
  if (value > 0) return "positive";
  return value < 0 ? "negative" : "text";
}
