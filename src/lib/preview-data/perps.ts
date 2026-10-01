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

// Open, high, low and close in cents of a TSLAx day chart from the design prototype; every market and range reuses its shape, scaled by the mark price over its 353.59 mark.
const CANDLE_SHAPE: readonly (readonly [number, number, number, number])[] = [
  [31776, 31878, 31324, 31603],
  [31721, 31961, 31038, 31214],
  [31332, 31564, 30747, 30810],
  [30927, 31002, 30818, 30880],
  [31018, 31360, 30884, 30971],
  [31096, 31368, 30409, 30790],
  [30912, 31261, 30519, 31073],
  [31191, 31544, 30499, 30652],
  [30770, 30861, 30201, 30362],
  [30480, 31073, 30224, 30959],
  [31077, 31501, 30833, 31320],
  [31442, 31513, 30798, 30924],
  [31041, 31540, 30880, 31340],
  [31458, 31843, 31305, 31635],
  [31752, 32499, 31615, 32200],
  [32322, 32715, 31965, 32479],
  [32601, 33116, 32204, 32962],
  [33084, 33281, 32322, 32636],
  [32754, 32978, 32291, 32354],
  [32475, 33076, 32224, 32758],
  [32876, 33595, 32581, 33434],
  [33552, 33992, 33344, 33740],
  [33858, 34750, 33642, 34369],
  [34487, 34836, 34192, 34766],
  [34884, 35540, 34546, 35139],
  [35257, 35445, 34750, 35033],
  [35151, 35367, 34471, 34581],
  [34699, 34770, 33933, 34251],
  [34373, 34510, 33752, 33941],
  [34059, 34691, 33850, 34612],
  [34730, 35218, 34392, 34856],
  [34978, 35665, 34781, 35520],
  [35638, 35999, 35123, 35512],
  [35630, 35744, 35096, 35229],
];

const SHAPE_MARK_CENTS = 35359;

const RANGE_AMPLITUDE: Record<Timeframe, number> = { "1H": 0.2, "4H": 0.45, "1D": 1, "1W": 1.3, "1M": 1.8 };

export function previewCandles(timeframe: Timeframe, markPrice: bigint): Candle[] {
  const amplitude = RANGE_AMPLITUDE[timeframe];
  const mark = Number(markPrice);
  const scale = (cents: number) => BigInt(Math.round(mark * (1 + (cents / SHAPE_MARK_CENTS - 1) * amplitude)));

  return CANDLE_SHAPE.map(([open, high, low, close]) => ({ open: scale(open), high: scale(high), low: scale(low), close: scale(close) }));
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
