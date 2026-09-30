// Placeholder data mirroring devnet values in design/; replaced by RPC reads.
import type { SwapHistoryEntry, SwapRoute, SwapSettings, SwapSymbol, SwapToken } from "@/types/swap";

const POOL_DEPTH_USD = 100_000_000n * 1_000_000n;

export const previewSwapTokens: readonly SwapToken[] = [
  { symbol: "USDC", name: "USD Coin", decimals: 6, priceUsd: 999_900n, balance: 3_120_400_000n, depthUsd: POOL_DEPTH_USD },
  { symbol: "TSLAx", name: "Tesla xStock", decimals: 8, priceUsd: 353_590_000n, balance: 125_000_000n, depthUsd: POOL_DEPTH_USD },
  { symbol: "SOL", name: "Solana", decimals: 9, priceUsd: 118_580_000n, balance: 2_100_000_000n, depthUsd: POOL_DEPTH_USD },
  { symbol: "GOOGLx", name: "Alphabet xStock", decimals: 8, priceUsd: 339_930_000n, balance: 0n, depthUsd: POOL_DEPTH_USD },
  { symbol: "AAPLx", name: "Apple xStock", decimals: 8, priceUsd: 332_370_000n, balance: 0n, depthUsd: POOL_DEPTH_USD },
  { symbol: "ANTHROPIC", name: "Anthropic PreStock", decimals: 6, priceUsd: 1_042_770_000n, balance: 960_000n, depthUsd: POOL_DEPTH_USD },
  { symbol: "OPENAI", name: "OpenAI PreStock", decimals: 6, priceUsd: 2_117_090_000n, balance: 0n, depthUsd: POOL_DEPTH_USD },
];

export const previewSwapRoutes: readonly SwapRoute[] = [
  { id: "jupiter", label: "Jupiter", description: "Best price across Solana pools", available: true },
  { id: "raydium", label: "Raydium", description: "Direct Raydium pools", available: false },
];

export const previewSwapDraft: { from: SwapSymbol; to: SwapSymbol; amountText: string; settings: SwapSettings } = {
  from: "USDC",
  to: "TSLAx",
  amountText: "250.00",
  settings: { mode: "auto", customBps: 100, deadlineMinutes: 20 },
};

export const previewSwapHistory: readonly SwapHistoryEntry[] = [
  {
    id: "swap-1",
    timestamp: Date.UTC(2026, 8, 26),
    from: "USDC",
    to: "TSLAx",
    amountIn: { raw: 441_990_000n, decimals: 6 },
    amountOut: { raw: 125_000_000n, decimals: 8 },
    valueUsd: 441_990_000n,
  },
  {
    id: "swap-2",
    timestamp: Date.UTC(2026, 8, 24),
    from: "USDC",
    to: "ANTHROPIC",
    amountIn: { raw: 1_001_060_000n, decimals: 6 },
    amountOut: { raw: 960_000n, decimals: 6 },
    valueUsd: 1_001_060_000n,
  },
  {
    id: "swap-3",
    timestamp: Date.UTC(2026, 8, 21),
    from: "SOL",
    to: "USDC",
    amountIn: { raw: 1_200_000_000n, decimals: 9 },
    amountOut: { raw: 142_300_000n, decimals: 6 },
    valueUsd: 142_300_000n,
  },
  {
    id: "swap-4",
    timestamp: Date.UTC(2026, 8, 19),
    from: "USDC",
    to: "SOL",
    amountIn: { raw: 156_530_000n, decimals: 6 },
    amountOut: { raw: 1_320_000_000n, decimals: 9 },
    valueUsd: 156_530_000n,
  },
];
