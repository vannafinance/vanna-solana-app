import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { useLivePaused } from "@/state/live-pause";

import { PERP_MARK } from "./perp-mark";
import { openMarketStream, type PhoenixMarket } from "./solana/phoenix";

// Live prices for the Perps Markets list: ONE socket carries every market (Phoenix's `market` channel), so the rows move as the
// website's terminal does. Ticks are batched and repainted at most every FLUSH_MS; the socket closes when the list is not on screen
// (another screen pushed over it), while the app is in the background and while a transaction runs. A tick also tells which way
// the price moved so the row can flash green or red.
// A tick repaints ONLY the list (local state), never the whole app: it used to call the global mutate(), which re-rendered every
// mounted tab (Portfolio, Lend, Farm, Trade) every 600 ms. On a Hermes dev build that kept the JS thread ~100% busy and turned a
// perps open into an 8-minute wait. Other screens pick the new marks up on their next render (PERP_MARK / the rows are updated in place).
type Row = { k: string; mark?: number; oracle?: number; ch: number; fund: number; oi: number; vol: number };
export type PriceMove = { dir: 1 | -1; n: number };

const FLUSH_MS = 600;

function apply(rows: Row[], m: PhoenixMarket) {
  PERP_MARK[m.symbol] = m.markPx;
  const row = rows.find((x) => x.k === m.symbol);
  if (!row) return;
  row.mark = m.markPx;
  if (m.oraclePx != null) row.oracle = m.oraclePx;
  if (m.prevDayPx != null && m.prevDayPx > 0) row.ch = ((m.markPx - m.prevDayPx) / m.prevDayPx) * 100;
  if (m.fundingHourlyPct != null) row.fund = m.fundingHourlyPct;
  if (m.openInterest != null) row.oi = m.openInterest * m.markPx;
  if (m.dayVolumeUsd != null) row.vol = m.dayVolumeUsd;
}

export function usePerpMarketsTicker(rows: Row[], enabled: boolean): Record<string, PriceMove> {
  const [moves, setMoves] = useState<Record<string, PriceMove>>({});
  const [, setTick] = useState(0);
  const [appActive, setActive] = useState(AppState.currentState === "active");
  const paused = useLivePaused();
  const focused = useIsFocused();
  const active = appActive && !paused && focused;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setActive(s === "active"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled || !active) return;
    let pending: Record<string, PhoenixMarket> = {};
    let dirty = false;
    const flush = setInterval(() => {
      if (!dirty) return;
      const batch = pending;
      pending = {};
      dirty = false;
      const next: Record<string, PriceMove> = {};
      for (const m of Object.values(batch)) {
        const before = rows.find((x) => x.k === m.symbol)?.mark ?? PERP_MARK[m.symbol];
        if (before != null && Number.isFinite(before) && m.markPx !== before) next[m.symbol] = { dir: m.markPx > before ? 1 : -1, n: 0 };
      }
      for (const m of Object.values(batch)) apply(rows, m);
      setTick((t) => t + 1);
      if (Object.keys(next).length) setMoves((prev) => {
        const out = { ...prev };
        for (const [k, v] of Object.entries(next)) out[k] = { dir: v.dir, n: (prev[k]?.n ?? 0) + 1 };
        return out;
      });
    }, FLUSH_MS);
    const symbols = rows.map((r) => r.k);
    const close = openMarketStream(symbols[0] ?? "SOL", "1m", {
      marketSymbols: symbols,
      onMarket: (m) => {
        pending[m.symbol] = m;
        dirty = true;
      },
    });
    return () => {
      clearInterval(flush);
      close();
    };
  }, [enabled, active, rows]);

  return moves;
}
