export type TradeTab = "markets" | "swap" | "positions" | "history";

let current: TradeTab | null = null;
let previous: TradeTab | null = null;

export function enterTradeTab(tab: TradeTab) {
  if (current === tab) return;
  previous = current;
  current = tab;
}

export function tradeTabBefore() {
  return previous;
}
