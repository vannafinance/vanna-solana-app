// Phoenix perps (mainnet), public and keyless, as the web app reads them (lib/farm/basis-live.ts):
// the WebSocket `market` channel gives mark / oracle price, 24 h volume and previous-day price, hourly funding (%) and
// open interest. One snapshot per refresh: subscribe, take the first frame per market, close.
const WS = "wss://perp-api.phoenix.trade/v1/ws";
export const HOURS_PER_YEAR = 24 * 365;

export type PhoenixMarket = {
  symbol: string;
  markPx: number;
  oraclePx: number | null;
  prevDayPx: number | null;
  dayVolumeUsd: number | null;
  fundingHourlyPct: number | null;
  openInterest: number | null;
};
const fin = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && Number.isFinite(Number(v)) ? Number(v) : null);

export function fetchPhoenixMarkets(symbols: string[], timeoutMs = 8000): Promise<Record<string, PhoenixMarket>> {
  return new Promise((resolve) => {
    const out: Record<string, PhoenixMarket> = {};
    let ws: WebSocket | null = null;
    const done = () => {
      clearTimeout(timer);
      try {
        ws?.close();
      } catch {}
      resolve(out);
    };
    const timer = setTimeout(done, timeoutMs);
    try {
      ws = new WebSocket(WS);
    } catch {
      return done();
    }
    ws.onopen = () => symbols.forEach((symbol) => ws?.send(JSON.stringify({ type: "subscribe", subscription: { channel: "market", symbol } })));
    ws.onerror = done;
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(String(e.data)) as Record<string, unknown>;
        const sym = typeof m.symbol === "string" ? m.symbol : null;
        const mark = fin(m.markPx);
        if (m.channel !== "market" || !sym || mark === null || out[sym]) return;
        out[sym] = { symbol: sym, markPx: mark, oraclePx: fin(m.oraclePx), prevDayPx: fin(m.prevDayPx), dayVolumeUsd: fin(m.dayNtlVlm), fundingHourlyPct: fin(m.funding), openInterest: fin(m.openInterest) };
        if (symbols.every((s) => out[s])) done();
      } catch {}
    };
  });
}

// ---- Chart, order book and trades for one market (what the web terminal's use-phoenix-live.ts reads) ----
// REST: GET /v1/candles/{SYM}?timeframe=&limit= (history, time in ms), GET /v1/trades/{SYM}/fills?limit= (last fills).
// WebSocket channels for the focused market: `candles` (frame {channel:"candle", candle, timeframe}, time in seconds),
// `orderbook` (bids / asks as [price, size], full snapshots) and `trades`.
const API = "https://perp-api.phoenix.trade";
export const PHOENIX_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export type PhoenixTimeframe = (typeof PHOENIX_TIMEFRAMES)[number];
export type Candle = { t: number; o: number; h: number; l: number; c: number };
export type BookLevel = [number, number];
export type PhoenixBook = { bids: BookLevel[]; asks: BookLevel[] };
export type PhoenixTrade = { id: string; price: number; size: number; buy: boolean; time: number };

const num = (v: unknown) => fin(v) ?? 0;
const toMs = (t: number) => (t < 1e12 ? t * 1000 : t);
const toCandle = (c: Record<string, unknown>): Candle => {
  const t = toMs(num(c.time));
  const trades = num(c.tradeCount);
  const mc = num(c.markClose);
  if (trades === 0 && mc > 0) {
    return { t, o: num(c.markOpen) || mc, h: num(c.markHigh) || mc, l: num(c.markLow) || mc, c: mc };
  }
  return { t, o: num(c.open), h: num(c.high), l: num(c.low), c: num(c.close) };
};
const levels = (rows: unknown, desc: boolean): BookLevel[] =>
  (Array.isArray(rows) ? rows : [])
    .map((r) => (Array.isArray(r) ? ([num(r[0]), num(r[1])] as BookLevel) : null))
    .filter((r): r is BookLevel => r !== null && r[0] > 0 && r[1] > 0)
    .sort((a, b) => (desc ? b[0] - a[0] : a[0] - b[0]));

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`Phoenix ${path} failed (${res.status})`);
  return (await res.json()) as T;
}

// endTimeMs (the API's `endTime`, ms) pages back: the `limit` candles ending at or before it.
export async function fetchPhoenixCandles(symbol: string, tf: PhoenixTimeframe, limit = 120, endTimeMs?: number): Promise<Candle[]> {
  const rows = await getJson<Record<string, unknown>[]>(`/v1/candles/${symbol}?timeframe=${tf}&limit=${limit}${endTimeMs ? `&endTime=${Math.floor(endTimeMs)}` : ""}`);
  return rows.map(toCandle).filter((c) => c.o > 0).sort((a, b) => a.t - b.t);
}

export async function fetchPhoenixFills(symbol: string, limit = 40): Promise<PhoenixTrade[]> {
  const body = await getJson<{ data?: Record<string, unknown>[] }>(`/v1/trades/${symbol}/fills?limit=${limit}`);
  return (body.data ?? []).map((f, i) => {
    const base = num(f.baseQty);
    return { id: `${String(f.transactionSignature ?? "")}-${i}`, price: num(f.price), size: Math.abs(base), buy: base > 0, time: Date.parse(String(f.timestamp ?? "")) || 0 };
  });
}

export type MarketStream = {
  onCandle?: (c: Candle) => void;
  onBook?: (b: PhoenixBook) => void;
  onTrades?: (fresh: PhoenixTrade[]) => void;
  onMarket?: (m: PhoenixMarket) => void;
  marketSymbols?: string[];
  onConnected?: (ok: boolean) => void;
};

// One socket for the focused market, with backoff reconnect. Returns a close() that stops it for good.
export function openMarketStream(symbol: string, tf: PhoenixTimeframe, h: MarketStream): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const connect = () => {
    try {
      ws = new WebSocket(WS);
    } catch {
      return;
    }
    const sock = ws;
    sock.onopen = () => {
      retry = 0;
      h.onConnected?.(true);
      const sub = (subscription: Record<string, string>) => sock.send(JSON.stringify({ type: "subscribe", subscription }));
      if (h.onBook) sub({ channel: "orderbook", symbol });
      if (h.onTrades) sub({ channel: "trades", symbol });
      if (h.onCandle) sub({ channel: "candles", symbol, timeframe: tf });
      if (h.onMarket) {
        const syms = h.marketSymbols?.length ? h.marketSymbols : [symbol];
        syms.forEach((s) => sub({ channel: "market", symbol: s }));
      }
    };
    sock.onmessage = (e) => {
      let m: Record<string, unknown>;
      try {
        m = JSON.parse(String(e.data));
      } catch {
        return;
      }
      if (m.channel === "market" && h.onMarket) {
        const sym = typeof m.symbol === "string" ? m.symbol : null;
        const mark = fin(m.markPx);
        if (sym && mark !== null) {
          h.onMarket({
            symbol: sym,
            markPx: mark,
            oraclePx: fin(m.oraclePx),
            prevDayPx: fin(m.prevDayPx),
            dayVolumeUsd: fin(m.dayNtlVlm),
            fundingHourlyPct: fin(m.funding),
            openInterest: fin(m.openInterest),
          });
        }
        return;
      }
      if (m.symbol !== symbol) return;
      if (m.channel === "candle" && m.candle && m.timeframe === tf) h.onCandle?.(toCandle(m.candle as Record<string, unknown>));
      else if (m.channel === "orderbook") {
        const ob = (m.orderbook ?? m) as Record<string, unknown>;
        h.onBook?.({ bids: levels(ob.bids, true), asks: levels(ob.asks, false) });
      } else if (m.channel === "trades" && Array.isArray(m.trades)) {
        const fresh = (m.trades as Record<string, unknown>[])
          .map((t) => {
            const base = num(t.baseAmount);
            return { id: String(t.tradeSequenceNumber ?? `${t.slot}-${t.slotIndex}`), price: base > 0 ? num(t.quoteAmount) / base : 0, size: base, buy: t.side === "bid", time: toMs(num(t.timestamp)) };
          })
          .filter((t) => t.price > 0)
          .reverse();
        h.onTrades?.(fresh);
      }
    };
    sock.onclose = () => {
      h.onConnected?.(false);
      if (closed) return;
      retry += 1;
      timer = setTimeout(connect, Math.min(15_000, 1000 * 2 ** Math.min(retry, 4)));
    };
    sock.onerror = () => {
      try {
        sock.close();
      } catch {}
    };
  };
  connect();
  return () => {
    closed = true;
    if (timer) clearTimeout(timer);
    try {
      ws?.close();
    } catch {}
  };
}
