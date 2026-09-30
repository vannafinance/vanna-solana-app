import { useMemo, useState, useSyncExternalStore } from "react";

import { usdToTokens } from "@/lib/perps/position-math";
import { summarizePosition } from "@/lib/perps/summarize-portfolio";
import { getWatchlist, previewCandles, previewMarkets, previewPositions, subscribeWatchlist, toggleWatchlist } from "@/lib/preview-data/perps";
import type { Candle, MarketKind, MarketListItem, PerpsMarket, PositionSummary, Timeframe } from "@/types/perps";
import type { Resource } from "@/types/resource";

import { previewResource } from "./preview-resource";

export type MarketFilter = "All" | MarketKind | "Watchlist";

export const MARKET_FILTERS: readonly MarketFilter[] = ["All", "xStocks", "PreStocks", "Watchlist"];
export const TIMEFRAMES: readonly Timeframe[] = ["1H", "4H", "1D", "1W", "1M"];

export type MarketDetail = {
  market: PerpsMarket;
  markets: readonly PerpsMarket[];
  liquidityTokens: bigint;
  candles: Candle[];
  watched: boolean;
  position: PositionSummary | null;
};

function matches(item: MarketListItem, filter: MarketFilter, query: string) {
  const inFilter = filter === "All" ? true : filter === "Watchlist" ? item.watched : item.kind === filter;
  const needle = query.trim().toLowerCase();
  return inFilter && (needle === "" || item.pair.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle));
}

export function usePerpsMarkets() {
  const watched = useSyncExternalStore(subscribeWatchlist, getWatchlist);
  const [filter, setFilter] = useState<MarketFilter>("All");
  const [query, setQuery] = useState("");

  const markets = useMemo<Resource<MarketListItem[]>>(() => {
    const visible = previewMarkets.map((market) => ({ ...market, watched: watched.has(market.symbol) })).filter((item) => matches(item, filter, query));
    return visible.length === 0 ? { status: "empty" } : previewResource(visible);
  }, [watched, filter, query]);

  return { markets, filter, setFilter, query, setQuery, toggleWatch: toggleWatchlist };
}

export function useMarketBySymbol(symbol: string): Resource<PerpsMarket> {
  const market = previewMarkets.find((candidate) => candidate.symbol === symbol);
  return market ? previewResource(market) : { status: "empty" };
}

export function usePerpsMarket(symbol: string) {
  const watched = useSyncExternalStore(subscribeWatchlist, getWatchlist);
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");

  const detail = useMemo<Resource<MarketDetail>>(() => {
    const market = previewMarkets.find((candidate) => candidate.symbol === symbol);
    if (!market) return { status: "empty" };
    const open = previewPositions.find((position) => position.symbol === market.symbol);
    return previewResource({
      market,
      markets: previewMarkets,
      liquidityTokens: usdToTokens(market.liquidityUsd, market.markPrice),
      candles: previewCandles(market.symbol, timeframe, market.markPrice),
      watched: watched.has(market.symbol),
      position: open ? summarizePosition(open, market.markPrice) : null,
    });
  }, [symbol, timeframe, watched]);

  return { detail, timeframe, setTimeframe, toggleWatch: toggleWatchlist };
}
