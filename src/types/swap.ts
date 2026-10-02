import type { TokenAmount } from "@/format/format-amount";

export type SwapSymbol = "USDC" | "SOL" | "TSLAx" | "GOOGLx" | "AAPLx" | "ANTHROPIC" | "OPENAI";

export type SwapToken = {
  symbol: SwapSymbol;
  name: string;
  decimals: number;
  priceUsd: bigint;
  balance: bigint;
};

export type SwapRouteId = "jupiter" | "raydium";

export type SwapRoute = {
  id: SwapRouteId;
  label: string;
  description: string;
  available: boolean;
};

export type SwapSettings = {
  mode: "auto" | "custom";
  customBps: number;
  deadlineMinutes: number;
};

export type SwapQuote = {
  amountOut: bigint;
  minReceived: bigint;
  priceImpactBps: number;
  payValueUsd: bigint;
  receiveValueUsd: bigint;
  slippageBps: number;
};

export type SwapIssue = "no-amount" | "insufficient-balance" | "quoting" | "no-route" | "quote-failed";

export type SwapState = {
  tokens: readonly SwapToken[];
  from: SwapToken;
  to: SwapToken;
  amountText: string;
  quote: SwapQuote | null;
  issue: SwapIssue | null;
  settings: SwapSettings;
  slippageBps: number;
  autoSlippageBps: number;
  route: SwapRoute;
  routes: readonly SwapRoute[];
};

export type SwapHistoryEntry = {
  id: string;
  signature: string;
  timestamp: number;
  from: SwapSymbol;
  to: SwapSymbol;
  amountIn: TokenAmount;
  amountOut: TokenAmount;
  valueUsd: bigint;
};

export type SwapHistoryGroup = {
  day: string;
  timestamp: number;
  entries: readonly SwapHistoryEntry[];
};

export type SwapHistory = {
  volumeUsd: bigint;
  groups: readonly SwapHistoryGroup[];
};
