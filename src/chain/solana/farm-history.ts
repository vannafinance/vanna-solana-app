// Farm vault history, real observations only (never sampled or filled in):
// - Kamino: its public API's daily reserve metrics (supply / borrow interest APY), same main market as farm.ts.
//   Served from 2023-10 onward; `frequency` accepts day or hour (week and month answer 400).
// - Perena: the web server's recorded hourly share prices (GET /api/solana/farm/vaults/history), the only source of
//   Perena history (Perena's own API has none). Until that route is open to the app (it answers 401 today), there is
//   no history and nothing is drawn.
// The share-price maths is ported as-is from the web's lib/farm/nav-math.ts so the figures match its vault pages.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { KAMINO_RESERVES } from "./farm";

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/* ---------- Kamino ---------- */
const KAMINO_MARKET = "https://api.kamino.finance/kamino-market/7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF/reserves";
export type KamSym = keyof typeof KAMINO_RESERVES;
/** One UTC day: supply and borrow interest APY in %. */
export type RateDay = { at: number; sup: number; bor: number };
/** "recent" = the last 100 days (enough to know whether anything older than 3 months exists); "all" = since Kamino's API starts. */
export type KamSpan = "recent" | "all";
const RECENT_DAYS = 100;

const TTL = 10 * 60_000;
const mem = new Map<string, { at: number; rows: RateDay[] }>();
const kamKey = (sym: KamSym, span: KamSpan) => `${sym}:${span}`;
const STORE = "farm-kam-history:v1:";

/** Cached rows for an instant first paint (memory first, then the last saved copy of the recent span). */
export function kaminoCached(sym: KamSym, span: KamSpan): RateDay[] | null {
  return mem.get(kamKey(sym, span))?.rows ?? null;
}
export async function kaminoSaved(sym: KamSym): Promise<RateDay[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE + sym);
    if (!raw) return null;
    const j = JSON.parse(raw) as { at: number; rows: [number, number, number][] };
    if (!j || Date.now() - j.at > DAY || !Array.isArray(j.rows)) return null;
    return j.rows.map(([at, sup, bor]) => ({ at, sup, bor }));
  } catch {
    return null;
  }
}

type KamRow = { timestamp: string; metrics?: { supplyInterestAPY?: number | string | null; borrowInterestAPY?: number | string | null } };
const fin = (v: unknown) => (v === null || v === undefined || v === "" ? NaN : Number(v));

/** Daily rate history of one Kamino reserve, oldest first. Throws when the API fails or `signal` aborts; an empty list means no history. */
export async function fetchKaminoHistory(sym: KamSym, span: KamSpan, signal?: AbortSignal): Promise<RateDay[]> {
  const key = kamKey(sym, span);
  const c = mem.get(key);
  if (c && Date.now() - c.at < TTL) return c.rows;
  const end = new Date();
  const start = span === "all" ? new Date(Date.UTC(2020, 0, 1)) : new Date(end.getTime() - RECENT_DAYS * DAY);
  const url = `${KAMINO_MARKET}/${KAMINO_RESERVES[sym]}/metrics/history?env=mainnet-beta&start=${start.toISOString()}&end=${end.toISOString()}&frequency=day`;
  const ctl = new AbortController();
  const stop = () => ctl.abort();
  signal?.addEventListener("abort", stop);
  const t = setTimeout(stop, span === "all" ? 30_000 : 15_000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`Kamino history ${r.status}`);
    const j = (await r.json()) as { history?: KamRow[] };
    if (!j || !Array.isArray(j.history)) throw new Error("Kamino history: bad response");
    const rows: RateDay[] = [];
    for (const h of j.history) {
      const at = Date.parse(h.timestamp), sup = fin(h.metrics?.supplyInterestAPY), bor = fin(h.metrics?.borrowInterestAPY);
      if (!Number.isFinite(at) || !Number.isFinite(sup) || !Number.isFinite(bor)) continue;
      rows.push({ at, sup: sup * 100, bor: bor * 100 });
    }
    rows.sort((a, b) => a.at - b.at);
    mem.set(key, { at: Date.now(), rows });
    if (span === "recent")
      AsyncStorage.setItem(STORE + sym, JSON.stringify({ at: Date.now(), rows: rows.map((x) => [x.at, x.sup, x.bor]) })).catch(() => {});
    return rows;
  } finally {
    clearTimeout(t);
    signal?.removeEventListener("abort", stop);
  }
}

/** Mean supply APY over the last 30 daily points; null below 30 days of history. */
export function avgSupply30(rows: RateDay[]): number | null {
  if (rows.length < 30) return null;
  const last = rows.slice(-30);
  return last.reduce((s, r) => s + r.sup, 0) / last.length;
}

/* ---------- Perena (the web server's recorded share prices) ---------- */
const VANNA_HISTORY = "https://test.vanna.finance/api/solana/farm/vaults/history";
export type PerId = "usdstar" | "junior";

/** web lib/farm/nav-math.ts NavPoint */
export interface NavPoint {
  /** Unix ms. */
  at: number;
  /** USD per share. */
  price: number;
}
/** One UTC day of a series: the day's UTC-midnight timestamp and its value. */
export interface DayPoint {
  at: number;
  value: number;
}

const perMem = new Map<PerId, { at: number; points: NavPoint[] | null }>();
const PER_TTL = 5 * 60_000, PER_MISS_TTL = 2 * 60_000;

export function perenaCached(id: PerId): NavPoint[] | null | undefined {
  const c = perMem.get(id);
  return c ? c.points : undefined;
}

/** The recorded share prices of a Perena vault, oldest first; null when the route is closed (401) or unreachable. */
export async function fetchPerenaHistory(id: PerId, signal?: AbortSignal): Promise<NavPoint[] | null> {
  const c = perMem.get(id);
  if (c && Date.now() - c.at < (c.points ? PER_TTL : PER_MISS_TTL)) return c.points;
  let points: NavPoint[] | null = null;
  try {
    const r = await fetch(`${VANNA_HISTORY}?id=perena-${id}`, { signal });
    if (r.ok) {
      const j = (await r.json()) as { points?: { at?: number; t?: number; price?: number }[] };
      if (j && Array.isArray(j.points))
        points = j.points
          .map((p) => ({ at: Number(p.at ?? p.t), price: Number(p.price) }))
          .filter((p) => Number.isFinite(p.at) && p.price > 0)
          .sort((a, b) => a.at - b.at);
    }
  } catch {
    if (signal?.aborted) throw new Error("aborted");
  }
  perMem.set(id, { at: Date.now(), points });
  return points;
}

/* ---------- web lib/farm/nav-math.ts (ported as-is) ---------- */
/**
 * Annualised share-price return over the last `days`, from the newest observation at or before the
 * target time (and no more than two hours older than it). Null when no such observation exists.
 */
export function historicalApy(points: NavPoint[], current: NavPoint, days: number): number | null {
  const target = current.at - days * DAY;
  const prior = [...points].reverse().find((p) => p.at <= target && target - p.at <= 2 * HOUR);
  if (!prior || prior.price <= 0 || current.price <= 0) return null;
  const result = (Math.pow(current.price / prior.price, (365 * DAY) / (current.at - prior.at)) - 1) * 100;
  return Number.isFinite(result) ? result : null;
}

/** The last observation of each UTC day, oldest first (the share-price chart's daily samples). */
export function dailySamples(points: NavPoint[]): DayPoint[] {
  const byDay = new Map<number, DayPoint>();
  for (const p of [...points].sort((a, b) => a.at - b.at)) {
    if (!(p.price > 0)) continue;
    const day = Math.floor(p.at / DAY) * DAY;
    byDay.set(day, { at: day, value: p.price });
  }
  return [...byDay.values()];
}

export interface NavStats {
  /** Annualised over the last 90 days (null below 90 days of history). */
  apy90: number | null;
  /** Annualised since the first recorded observation (null below one day of history). */
  sinceLaunch: number | null;
  /** Share-price change since the first recorded observation, % (null below one day). */
  roi: number | null;
  /** Mean daily return / its standard deviation × √365 (null below 3 daily returns or zero variance). */
  sharpe: number | null;
  /** Largest fall from a previous high, % (≤ 0; null without at least two observations). */
  maxDrawdown: number | null;
  /** First recorded observation, unix ms (null when nothing is recorded). */
  firstAt: number | null;
}

export function navStats(points: NavPoint[]): NavStats {
  const sorted = [...points].filter((p) => p.price > 0).sort((a, b) => a.at - b.at);
  const empty: NavStats = { apy90: null, sinceLaunch: null, roi: null, sharpe: null, maxDrawdown: null, firstAt: sorted[0]?.at ?? null };
  if (sorted.length < 2) return empty;
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = last.at - first.at;
  let peak = first.price;
  let mdd = 0;
  for (const p of sorted) {
    peak = Math.max(peak, p.price);
    mdd = Math.min(mdd, p.price / peak - 1);
  }
  const days = dailySamples(sorted);
  const rets = days.slice(1).map((d, i) => d.value / days[i].value - 1);
  let sharpe: number | null = null;
  if (rets.length >= 3) {
    const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
    const sd = Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / rets.length);
    sharpe = sd > 0 ? (mean / sd) * Math.sqrt(365) : null;
  }
  const enough = span >= DAY;
  const since = enough ? (Math.pow(last.price / first.price, (365 * DAY) / span) - 1) * 100 : null;
  return {
    apy90: historicalApy(sorted, last, 90),
    sinceLaunch: since !== null && Number.isFinite(since) ? since : null,
    roi: enough ? (last.price / first.price - 1) * 100 : null,
    sharpe,
    maxDrawdown: mdd * 100,
    firstAt: first.at,
  };
}
