import type { ChartSource, PerpsSymbol } from "@/types/perps";

// The same sources as the web app. Listed stocks use TradingView with the real ticker the token tracks; the PreStock
// tokens have no public listing, so their chart is the DexScreener pair for the token itself on Solana.
const TRADINGVIEW_SYMBOLS: Partial<Record<PerpsSymbol, string>> = {
  TSLAx: "NASDAQ:TSLA",
  GOOGLx: "NASDAQ:GOOGL",
  AAPLx: "NASDAQ:AAPL",
};

const DEXSCREENER_PAIRS: Partial<Record<PerpsSymbol, string>> = {
  ANTHROPIC: "9thgWVMJUKiiotrVmzhEy1MWPyvkNsUSwKbp8ZFsuhA2",
  OPENAI: "4HTy7aTjPm5PTSEws2yWRDPX6gjWM6sC2dV5mv9u8JsH",
};

export function chartSourceFor(symbol: PerpsSymbol): ChartSource | null {
  const tradingView = TRADINGVIEW_SYMBOLS[symbol];
  if (tradingView !== undefined) return { kind: "tradingview", symbol: tradingView };
  const pairAddress = DEXSCREENER_PAIRS[symbol];
  return pairAddress === undefined ? null : { kind: "dexscreener", pairAddress };
}
