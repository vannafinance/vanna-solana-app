import type { SwapRoute, SwapSettings } from "@/types/swap";

// Raydium is listed but not selectable: the app only requests Jupiter quotes.
export const swapRoutes: readonly SwapRoute[] = [
  { id: "jupiter", label: "Jupiter", description: "Best price across Solana pools", available: true },
  { id: "raydium", label: "Raydium", description: "Direct Raydium pools", available: false },
];

export const defaultSwapSettings: SwapSettings = { mode: "auto", customBps: 100, deadlineMinutes: 20 };
