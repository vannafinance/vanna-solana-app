import type { SwapSettings } from "@/types/swap";

export const AUTO_SLIPPAGE_BPS = 50;

export function effectiveSlippageBps(settings: SwapSettings): number {
  return settings.mode === "auto" ? AUTO_SLIPPAGE_BPS : settings.customBps;
}
