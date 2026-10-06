import { useMemo, useState, useSyncExternalStore } from "react";

import { chartSourceFor } from "@/lib/perps/chart-sources";
import { usdToTokens } from "@/lib/perps/position-math";
import { getWatchlist, subscribeWatchlist, toggleWatchlist } from "@/lib/perps/watchlist-store";
import type { Candle, ChartSource, MarketExposure, MarketKind, MarketListItem, PerpsMarket, PositionSummary, Timeframe } from "@/types/perps";
import type { Resource } from "@/types/resource";

import { useMarketList } from "./use-market-list";
import { usePerpsPositions } from "./use-perps-positions";

export type MarketFilter = "All" | MarketKind | "Watchlist";

export const MARKET_FILTERS: readonly MarketFilter[] = ["All", "xStocks", "PreStocks", "Watchlist"];
export const TIMEFRAMES: readonly Timeframe[] = ["1H", "4H", "1D", "1W", "1M"];

export type MarketDetail = {
  market: PerpsMarket;
  markets: readonly PerpsMarket[];
  liquidityTokens: bigint;
  candles: Candle[];
  chart: ChartSource | null;
  watched: boolean;
  position: PositionSummary | null;
};

function matches(item: MarketListItem, filter: MarketFilter, query: string) {
  const inFilter = filter === "All" ? true : filter === "Watchlist" ? item.watched : item.kind === filter;
  const needle = query.trim().toLowerCase();
  return inFilter && (needle === "" || item.pair.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle));
}

// The list never waits for positions: until they are read (or with no margin account) every market shows no open side.
export function usePerpsMarkets() {
  const watched = useSyncExternalStore(subscribeWatchlist, getWatchlist);
  const list = useMarketList();
  const portfolio = usePerpsPositions();
  const [filter, setFilter] = useState<MarketFilter>("All");
  const [query, setQuery] = useState("");

  const markets = useMemo<Resource<MarketListItem[]>>(() => {
    if (list.status !== "ready") return list;
    const positions = portfolio.status === "ready" ? portfolio.data.positions : [];
    const openIn = (symbol: PerpsMarket["symbol"]): MarketExposure | null => {
      const position = positions.find((candidate) => candidate.symbol === symbol);
      return position ? { side: position.side, leverage: position.leverage } : null;
    };
    const visible = list.data
      .map((market) => ({ ...market, watched: watched.has(market.symbol), open: openIn(market.symbol) }))
      .filter((item) => matches(item, filter, query));
    return visible.length === 0 ? { status: "empty" } : { ...list, data: visible };
  }, [list, portfolio, watched, filter, query]);

  return { markets, filter, setFilter, query, setQuery, toggleWatch: toggleWatchlist };
}

export function useMarketBySymbol(symbol: string): Resource<PerpsMarket> {
  const list = useMarketList();
  if (list.status !== "ready") return list;
  const market = list.data.find((candidate) => candidate.symbol === symbol);
  return market ? { ...list, data: market } : { status: "empty" };
}

// No candle source exists for these markets yet, so the chart receives none and says so.
export function usePerpsMarket(symbol: string) {
  const watched = useSyncExternalStore(subscribeWatchlist, getWatchlist);
  const list = useMarketList();
  const portfolio = usePerpsPositions();
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");

  const detail = useMemo<Resource<MarketDetail>>(() => {
    if (list.status !== "ready") return list;
    const market = list.data.find((candidate) => candidate.symbol === symbol);
    if (!market) return { status: "empty" };
    const open = portfolio.status === "ready" ? portfolio.data.positions.find((position) => position.symbol === market.symbol) : undefined;
    return {
      ...list,
      data: {
        market,
        markets: list.data,
        liquidityTokens: usdToTokens(market.liquidityUsd, market.markPrice),
        candles: [],
        chart: chartSourceFor(market.symbol),
        watched: watched.has(market.symbol),
        position: open ?? null,
      },
    };
  }, [list, portfolio, symbol, watched]);

  return { detail, timeframe, setTimeframe, toggleWatch: toggleWatchlist };
}
