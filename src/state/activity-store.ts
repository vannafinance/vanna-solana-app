import AsyncStorage from "@react-native-async-storage/async-storage";

import { ACTIVITY, type Activity, PERP_HIST, type PerpHist } from "@/sample/data";
import type { Chain } from "@/state/chain";
import { mutate } from "@/state/store";

// History of the wallet's own transactions. A row is kept on the phone, per wallet, as soon as the chain confirms it, so it is
// still there after the app restarts; readers of the chain fill in what happened elsewhere.
const key = (chain: Chain, owner: string) => `vanna.activity.${chain}.${owner}`;
const same = (a: Activity, b: Activity) => !!a.hash && a.hash === b.hash && a.action === b.action && a.sym === b.sym;

async function saved(chain: Chain, owner: string): Promise<Activity[]> {
  try {
    const raw = await AsyncStorage.getItem(key(chain, owner));
    return raw ? (JSON.parse(raw) as Activity[]) : [];
  } catch {
    return [];
  }
}

// Saves are read-modify-write on one key: several at once (Close all saves a row per position) would overwrite each other, so they run one after the other.
let writes: Promise<unknown> = Promise.resolve();
const queued = <T,>(job: () => Promise<T>): Promise<T> => {
  const run = writes.then(job, job);
  writes = run.catch(() => undefined);
  return run;
};

export const rememberActivity = (chain: Chain, owner: string, row: Activity) =>
  queued(async () => {
    const rows = [row, ...(await saved(chain, owner)).filter((r) => !same(r, row))].slice(0, 200);
    await AsyncStorage.setItem(key(chain, owner), JSON.stringify(rows)).catch(() => {});
  });

// The Perps Trades / Transfers lists (opens, closes, deposits) carry the side, size and leverage the chain does not list, so they are
// kept on the phone per wallet too and read back after a restart.
const pkey = (owner: string) => `vanna.perphist.v1.${owner}`;
const samePerp = (a: PerpHist, b: PerpHist) => a.ms != null && a.ms === b.ms && a.a === b.a && a.k === b.k;

async function savedPerps(owner: string): Promise<PerpHist[]> {
  try {
    const raw = await AsyncStorage.getItem(pkey(owner));
    return raw ? (JSON.parse(raw) as PerpHist[]) : [];
  } catch {
    return [];
  }
}

export const rememberPerpHist = (owner: string, row: PerpHist) =>
  queued(async () => {
    const rows = [row, ...(await savedPerps(owner)).filter((r) => !samePerp(r, row))].slice(0, 200);
    await AsyncStorage.setItem(pkey(owner), JSON.stringify(rows)).catch(() => {});
  });

/** Puts a Perps trade at the top of the list and keeps it on the phone. */
export function addPerpHist(owner: string | undefined, row: Omit<PerpHist, "ms">) {
  const r: PerpHist = { ...row, ms: Date.now() };
  PERP_HIST.unshift(r);
  if (owner) void rememberPerpHist(owner, r);
}

/** This wallet's saved Perps rows, together with any added since the app started (newest first). */
/** One order is one transaction: when two rows carry the same hash, keep the one with the order's own numbers (leverage), drop the chain copy. */
function dedupePerpHist() {
  // One order is one transaction: two rows for the same hash AND the same market / side / kind are one order seen twice (a saved row
  // and the chain's copy): keep the one with the order's own numbers. Rows of different markets may share a hash (Close all signs
  // its closes together and saves the last signature for each); those are different orders.
  for (let i = 0; i < PERP_HIST.length; i++) {
    const r = PERP_HIST[i];
    if (!r.hash) continue;
    const j = PERP_HIST.findIndex((x, k) => k > i && x.hash === r.hash && x.a === r.a && x.k === r.k && x.side === r.side);
    if (j < 0) continue;
    PERP_HIST.splice(r.lev == null && PERP_HIST[j].lev != null ? i : j, 1);
    i = -1;
  }
}

export async function loadPerpHist(owner: string) {
  const mine = await savedPerps(owner);
  mutate(() => {
    const merged = [...PERP_HIST];
    for (const r of mine) if (!merged.some((m) => samePerp(m, r))) merged.push(r);
    merged.sort((a, b) => (b.ms ?? Number.MAX_SAFE_INTEGER) - (a.ms ?? Number.MAX_SAFE_INTEGER));
    PERP_HIST.length = 0;
    PERP_HIST.push(...merged);
    dedupePerpHist();
  });
}

/**
 * Adds the Perps orders read from the chain (see chain/solana/perp-history.ts), rebuilt on every read: the chain's own rows are
 * dropped and re-added, so none is ever listed twice. A row the phone saved for an order keeps its exact numbers and takes the
 * chain order's hash (the link opens that order, not, for the last close, the withdraw that followed it). Saved and chain rows
 * of one market, side and kind are paired newest first: the fork's clock differs from the phone's, so times are not compared.
 */
export function mergeChainPerpHist(owner: string, chain: PerpHist[]) {
  mutate(() => {
    for (let i = PERP_HIST.length - 1; i >= 0; i--) if (PERP_HIST[i].fromChain) PERP_HIST.splice(i, 1);
    const group = (r: PerpHist) => `${r.a}|${r.k}|${r.side}`;
    const rows = chain.map((c) => ({ ...c, fromChain: true }));
    const claimed = new Set<PerpHist>();
    // A saved row already carrying the hash of a chain order of its group is settled.
    for (const r of PERP_HIST) {
      const c = r.hash ? rows.find((x) => x.hash === r.hash && group(x) === group(r)) : undefined;
      if (c) claimed.add(c);
    }
    const saved = PERP_HIST.filter((r) => r.lev != null && !(r.hash && rows.some((x) => x.hash === r.hash && group(x) === group(r))));
    const byNewest = (x: PerpHist, y: PerpHist) => (y.ms ?? 0) - (x.ms ?? 0);
    for (const g of new Set(saved.map(group))) {
      const mine = saved.filter((r) => group(r) === g).sort(byNewest);
      const theirs = rows.filter((c) => group(c) === g && !claimed.has(c)).sort(byNewest);
      for (const r of mine) {
        const c = theirs.find((x) => !claimed.has(x) && (r.qty == null || x.qty == null || Math.abs(r.qty - x.qty) <= 1e-6 * Math.max(1, x.qty)));
        if (!c) continue;
        claimed.add(c);
        r.hash = c.hash;
        void rememberPerpHist(owner, r);
      }
    }
    for (const c of rows) if (!claimed.has(c)) PERP_HIST.push(c);
    dedupePerpHist();
    PERP_HIST.sort((a, b) => (b.ms ?? Number.MAX_SAFE_INTEGER) - (a.ms ?? Number.MAX_SAFE_INTEGER));
  });
}

/** A confirmed transaction's rows: saved on the phone and shown at once (the chain read replaces them with its own rows). */
export function recordConfirmed(chain: Chain, owner: string, rows: Activity[]) {
  mutate(() => {
    for (const row of [...rows].reverse()) if (!ACTIVITY[chain].some((r) => same(r, row))) ACTIVITY[chain].unshift(row);
  });
  for (const row of rows) void rememberActivity(chain, owner, row);
}

/**
 * Replaces the screen's history with this wallet's: the rows decoded from the chain, plus rows the phone saved for transactions
 * the chain reader has no row for (not indexed yet, or older than its scan). A chain row wins over a saved row with the same
 * signature. `fromChainRead` = the chain was read just now: rows without a signature (an action whose hash never came back)
 * are dropped then, because the chain's own rows stand in for them; otherwise they stay as they are.
 */
export async function loadActivity(chain: Chain, owner: string, fromChain: Activity[] = [], fromChainRead = false) {
  const mine = await saved(chain, owner);
  const onChain = new Set(fromChain.map((r) => r.hash).filter(Boolean));
  // The chain lists a Phoenix order only as "Order" (no side, size or market); the phone saved what the app knew when it sent it.
  const richer = new Map(mine.filter((r) => r.hash && r.action !== "Order").map((r) => [r.hash, r]));
  const merged = fromChain.map((c) => {
    const r = c.action === "Order" && c.hash ? richer.get(c.hash) : undefined;
    return r ? { ...r, t: c.t, ms: c.ms } : c;
  });
  for (const r of mine) if (!(r.hash && onChain.has(r.hash)) && !merged.some((m) => same(m, r))) merged.push(r);
  // newest first; a row without a time (pending) on top
  merged.sort((a, b) => (b.ms ?? Number.MAX_SAFE_INTEGER) - (a.ms ?? Number.MAX_SAFE_INTEGER));
  mutate(() => {
    const keep = fromChainRead ? [] : ACTIVITY[chain].filter((r) => !r.hash);
    ACTIVITY[chain].length = 0;
    ACTIVITY[chain].push(...keep, ...merged);
  });
}
