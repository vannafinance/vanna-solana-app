// Placeholder data mirroring devnet values in design/; replaced by RPC reads.
import type { Candle, ClosedPosition, PerpsMarket, PerpsPosition, PerpsSymbol, Timeframe } from "@/types/perps";

const USD = 1_000_000n;

function usd(whole: number, cents = 0) {
  return BigInt(whole) * USD + BigInt(cents) * 10_000n;
}

export const previewMarkets: readonly PerpsMarket[] = [
  { symbol: "TSLAx", pair: "TSLAx-USDC", name: "Tesla xStock", kind: "xStocks", markPrice: usd(353, 59), tokenBorrowBps: 477, usdcBorrowBps: 65, liquidityUsd: usd(24_044), maxLeverage: 5 },
  { symbol: "GOOGLx", pair: "GOOGLx-USDC", name: "Alphabet xStock", kind: "xStocks", markPrice: usd(339, 93), tokenBorrowBps: 125, usdcBorrowBps: 65, liquidityUsd: usd(61_200), maxLeverage: 5 },
  { symbol: "AAPLx", pair: "AAPLx-USDC", name: "Apple xStock", kind: "xStocks", markPrice: usd(332, 37), tokenBorrowBps: 36, usdcBorrowBps: 65, liquidityUsd: usd(45_200), maxLeverage: 5 },
  { symbol: "ANTHROPIC", pair: "ANTHROPIC-USDC", name: "Anthropic PreStock", kind: "PreStocks", markPrice: usd(1_042, 77), tokenBorrowBps: 40, usdcBorrowBps: 65, liquidityUsd: usd(127_300), maxLeverage: 5 },
  { symbol: "OPENAI", pair: "OPENAI-USDC", name: "OpenAI PreStock", kind: "PreStocks", markPrice: usd(2_117, 9), tokenBorrowBps: 59, usdcBorrowBps: 65, liquidityUsd: usd(254_300), maxLeverage: 5 },
];

export const previewPositions: readonly PerpsPosition[] = [
  { id: "tslax-long", symbol: "TSLAx", side: "long", leverage: 3, openedOn: "Sep 22", entryPrice: usd(341, 20), tokens: 12_310_000n, collateral: usd(1_400) },
  { id: "openai-short", symbol: "OPENAI", side: "short", leverage: 2, openedOn: "Sep 25", entryPrice: usd(2_180), tokens: 917_400n, collateral: usd(1_000) },
];

export const previewClosedPositions: readonly ClosedPosition[] = [
  { id: "aaplx-long", symbol: "AAPLx", side: "long", leverage: 2, openedOn: "Sep 24", heldFor: "3 days", entryPrice: usd(318, 10), exitPrice: usd(324, 20), tokens: 6_300_000n, collateral: usd(1_000), fees: usd(1, 26) },
  { id: "googlx-short", symbol: "GOOGLx", side: "short", leverage: 3, openedOn: "Sep 18", heldFor: "2 days", entryPrice: usd(334, 10), exitPrice: usd(339, 11), tokens: 4_200_000n, collateral: usd(700), fees: usd(0, 84) },
  { id: "openai-long", symbol: "OPENAI", side: "long", leverage: 2, openedOn: "Sep 8", heldFor: "5 days", entryPrice: usd(2_090), exitPrice: usd(2_118), tokens: 457_100n, collateral: usd(500), fees: usd(0, 38) },
];

export const previewAccount = { margin: usd(10_592, 29), borrowed: usd(6_271, 92) } as const;

const candleShape: Record<Timeframe, { swing: number; drift: number; period: number }> = {
  "1H": { swing: 0.012, drift: 0.004, period: 5.5 },
  "4H": { swing: 0.025, drift: 0.01, period: 7 },
  "1D": { swing: 0.09, drift: 0.07, period: 9 },
  "1W": { swing: 0.12, drift: -0.04, period: 11 },
  "1M": { swing: 0.18, drift: 0.12, period: 13 },
};

const CANDLE_COUNT = 34;

// Deterministic stand-in for an OHLC feed: seeded by symbol so every reload draws the same chart, anchored on the mark price.
export function previewCandles(symbol: PerpsSymbol, timeframe: Timeframe, markPrice: bigint): Candle[] {
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const { swing, drift, period } = candleShape[timeframe];
  const mark = Number(markPrice) / 1e6;
  const raw = Array.from({ length: CANDLE_COUNT + 1 }, (_, index) => {
    const t = index / CANDLE_COUNT;
    return drift * t + swing * (0.6 * Math.sin(index / period + seed) + 0.4 * Math.sin(index / (period / 2.3) + seed * 0.7));
  });
  const anchor = raw[CANDLE_COUNT];
  const toPrice = (value: number) => BigInt(Math.round(mark * (1 + value - anchor) * 1e6));

  return raw.slice(1).map((close, index) => {
    const open = raw[index];
    const wick = swing * 0.25 * (0.5 + Math.abs(Math.sin(index * 1.7 + seed)));
    return {
      open: toPrice(open),
      close: toPrice(close),
      high: toPrice(Math.max(open, close) + wick),
      low: toPrice(Math.min(open, close) - wick),
    };
  });
}

const listeners = new Set<() => void>();
let watched: ReadonlySet<PerpsSymbol> = new Set<PerpsSymbol>(["TSLAx", "OPENAI"]);

export function getWatchlist() {
  return watched;
}

export function toggleWatchlist(symbol: PerpsSymbol) {
  const next = new Set(watched);
  if (next.has(symbol)) next.delete(symbol);
  else next.add(symbol);
  watched = next;
  listeners.forEach((listener) => listener());
}

export function subscribeWatchlist(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
