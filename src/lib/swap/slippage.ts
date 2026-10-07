import type { SwapSettings } from "@/types/swap";

// The web app's automatic slippage. Fork pools drift from Jupiter's live quote, so a tighter default fails more swaps.
export const AUTO_SLIPPAGE_BPS = 100;

export function effectiveSlippageBps(settings: SwapSettings): number {
  return settings.mode === "auto" ? AUTO_SLIPPAGE_BPS : settings.customBps;
}
