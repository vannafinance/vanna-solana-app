import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { PERP_MARK } from "./perp-mark";
import { type Candle, fetchPhoenixCandles, fetchPhoenixFills, openMarketStream, type PhoenixBook, type PhoenixMarket, type PhoenixTimeframe, type PhoenixTrade } from "./solana/phoenix";
import { PERP_MKTS } from "@/screens/trade/perps";

// Live Phoenix data for one perp market page: REST candle history + the last fills, then the socket keeps the last candle, the
// order book and the trades current. The socket closes when the screen unmounts and while the app is in the background.
export type { Candle, PhoenixBook, PhoenixMarket, PhoenixTrade };

export const TF_API: Record<string, PhoenixTimeframe> = { "1m": "1m", "5m": "5m", "15m": "15m", "1H": "1h", "4H": "4h", "1D": "1d" };
const TF_MS: Record<PhoenixTimeframe, number> = { "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 };
const MAX_TRADES = 40;
const BOOK_FLUSH_MS = 200;
const ALL_PERP_SYMBOLS = ["SOL", "ETH", "BTC", "TSLA", "META"];

function applyPhoenixMarket(m: PhoenixMarket) {
  PERP_MARK[m.symbol] = m.markPx;
  const row = PERP_MKTS.find((x) => x.k === m.symbol);
  if (!row) return;
  row.mark = m.markPx;
  if (m.oraclePx != null) row.oracle = m.oraclePx;
  if (m.prevDayPx != null && m.prevDayPx > 0) row.ch = ((m.markPx - m.prevDayPx) / m.prevDayPx) * 100;
  if (m.fundingHourlyPct != null) row.fund = m.fundingHourlyPct;
  if (m.openInterest != null) row.oi = m.openInterest * m.markPx;
  if (m.dayVolumeUsd != null) row.vol = m.dayVolumeUsd;
}

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setActive(s === "active"));
    return () => sub.remove();
  }, []);
  return active;
}

const INITIAL = 240; // candles fetched up front; panning back pages older ones (PAGE at a time)
const PAGE = 300;

// History grows to the left as the user pans back (REST `endTime`); the live frame updates or appends the last candle.
export function usePhoenixCandles(symbol: string, tf: string): { candles: Candle[]; loading: boolean; loadOlder: () => void } {
  const api = TF_API[tf] ?? "1h";
  const bucketMs = TF_MS[api] ?? 3_600_000;
  const key = `${symbol}:${api}`;
  const active = useAppActive();
  const [state, setState] = useState<{ key: string; rows: Candle[] }>({ key: "", rows: [] });
  const busy = useRef(false);
  const done = useRef<string>(""); // key whose start of history has been reached
  const firstT = state.key === key ? state.rows[0]?.t : undefined;

  useEffect(() => {
    if (!active) return;
    let alive = true;
    let close = () => {};
    fetchPhoenixCandles(symbol, api, INITIAL)
      .then((rows) => {
        if (!alive) return;
        // keep any older candles already loaded for this market and timeframe
        setState((prev) => ({ key, rows: prev.key === key && prev.rows.length ? [...prev.rows.filter((c) => c.t < rows[0].t), ...rows] : rows }));
        const tickPrice = (px: number, ts = Date.now()) => {
          if (!(px > 0)) return;
          setState((prev) => {
            if (prev.key !== key || !prev.rows.length) return prev;
            const last = prev.rows[prev.rows.length - 1];
            const bucketStart = Math.floor(ts / bucketMs) * bucketMs;
            if (bucketStart > last.t) {
              return { key, rows: [...prev.rows, { t: bucketStart, o: last.c, h: Math.max(last.c, px), l: Math.min(last.c, px), c: px }] };
            }
            if (last.c === px && px <= last.h && px >= last.l) return prev;
            const nextLast: Candle = { t: last.t, o: last.o, h: Math.max(last.h, px), l: Math.min(last.l, px), c: px };
            return { key, rows: [...prev.rows.slice(0, -1), nextLast] };
          });
        };
        close = openMarketStream(symbol, api, {
          onCandle: (c) =>
            setState((prev) => {
              if (prev.key !== key || !prev.rows.length) return prev;
              const last = prev.rows[prev.rows.length - 1];
              if (c.t === last.t) return { key, rows: [...prev.rows.slice(0, -1), c] };
              if (c.t > last.t) return { key, rows: [...prev.rows, c] };
              return prev;
            }),
          onMarket: (m) => {
            applyPhoenixMarket(m);
            if (m.symbol === symbol) tickPrice(m.markPx);
          },
          onTrades: (fresh) => {
            if (fresh.length > 0) tickPrice(fresh[0].price, fresh[0].time || Date.now());
          },
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      close();
    };
  }, [symbol, api, bucketMs, key, active]);

  const loadOlder = useCallback(() => {
    if (firstT === undefined || busy.current || done.current === key) return;
    busy.current = true;
    fetchPhoenixCandles(symbol, api, PAGE, firstT - 1)
      .then((older) => {
        const fresh = older.filter((c) => c.t < firstT);
        if (fresh.length < 2) done.current = key;
        if (fresh.length) setState((prev) => (prev.key === key ? { key, rows: [...fresh, ...prev.rows.filter((c) => c.t >= firstT)] } : prev));
      })
      .catch(() => undefined)
      .finally(() => {
        busy.current = false;
      });
  }, [symbol, api, key, firstT]);

  return { candles: state.key === key ? state.rows : [], loading: state.key !== key, loadOlder };
}

export function usePhoenixBookTrades(symbol: string, enabled: boolean): {
  book: PhoenixBook | null;
  trades: PhoenixTrade[];
  markets: Record<string, PhoenixMarket>;
  connected: boolean;
} {
  const active = useAppActive();
  const [book, setBook] = useState<{ symbol: string; b: PhoenixBook } | null>(null);
  const [trades, setTrades] = useState<{ symbol: string; rows: PhoenixTrade[] }>({ symbol: "", rows: [] });
  const [markets, setMarkets] = useState<Record<string, PhoenixMarket>>({});
  const [connected, setConnected] = useState(false);
  const pending = useRef<PhoenixBook | null>(null);
  const pendingMarkets = useRef<Record<string, PhoenixMarket> | null>(null);

  useEffect(() => {
    if (!enabled || !active) return;
    let alive = true;
    pending.current = null;
    pendingMarkets.current = null;
    fetchPhoenixFills(symbol, MAX_TRADES)
      .then((rows) => alive && setTrades((p) => (p.symbol === symbol && p.rows.length ? p : { symbol, rows })))
      .catch(() => undefined);
    // the book and market ticker stream many updates a second; repaint at most every BOOK_FLUSH_MS (200ms)
    const flush = setInterval(() => {
      if (pending.current) {
        setBook({ symbol, b: pending.current });
        pending.current = null;
      }
      if (pendingMarkets.current) {
        const batch = pendingMarkets.current;
        pendingMarkets.current = null;
        setMarkets((prev) => ({ ...prev, ...batch }));
      }
    }, BOOK_FLUSH_MS);
    const close = openMarketStream(symbol, "1m", {
      onConnected: (ok) => alive && setConnected(ok),
      onBook: (b) => {
        pending.current = b;
      },
      onTrades: (fresh) => setTrades((p) => ({ symbol, rows: [...fresh, ...(p.symbol === symbol ? p.rows : [])].slice(0, MAX_TRADES) })),
      marketSymbols: ALL_PERP_SYMBOLS,
      onMarket: (m) => {
        applyPhoenixMarket(m);
        pendingMarkets.current = { ...(pendingMarkets.current ?? {}), [m.symbol]: m };
      },
    });
    return () => {
      alive = false;
      clearInterval(flush);
      close();
    };
  }, [symbol, enabled, active]);

  return {
    book: book?.symbol === symbol ? book.b : null,
    trades: trades.symbol === symbol ? trades.rows : [],
    markets,
    connected,
  };
}
