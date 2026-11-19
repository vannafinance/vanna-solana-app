import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { ACCOUNT, ACTIVITY, DATA, NOTES, PERP_HIST, type ChainData } from "@/sample/data";
import { rewardsNow, setRewards } from "@/sample/rewards";
import type { Chain } from "@/state/chain";
import { loadActivity, loadPerpHist, mergeChainPerpHist } from "@/state/activity-store";
import { perpHistFromChain } from "./solana/perp-history";
import { mutate } from "@/state/store";
import { inUseWallet, onWalletsChanged, walletState } from "@/state/wallets";

import { REAL_BUILD } from "./build";
import { fetchSolanaAccount } from "./solana/account";
import { addSnap, loadLedger, observeRows, type PxLedger, saveLedger } from "@/state/price-ledger";
import { applyHistoryFigures, type ChainHistory, type ChainRow, fetchSolanaHistory, historyCacheFor, netDepositsUsd, seedHistoryCache, toActivity } from "./solana/history";
import { VANNA_PROGRAM_ID } from "./solana/config";
import { decode58, findPda } from "./solana/pda";
import { fetchSolanaPositions } from "./solana/positions";

/* The signed-in wallet's own figures, read from the chain and written into DATA[chain] (the shape every screen reads):
   wallet balances, Earn positions, margin collateral and debt. Health factor, debt, equity and leverage are the chain
   readers' figures (they match test.vanna.finance exactly); acct() in src/sample/model.ts uses them through LIVE_ACCT.
   Only a real wallet is read: with a stand-in (preview) wallet the screens show dashes (src/state/personal.ts) and DATA
   keeps the demo account. Refreshes when the wallet in use changes, every 30 s, and when the app comes back. */

export type LiveAcct = { hf: number; debtUsd: number; equity: number; lev: number; collUsd: number; address?: string };
// model.ts registers how to compute the margin account's P&L (it cannot be imported here: it imports this file)
let pnlProbe: ((chain: Chain) => number | null) | null = null;
export const setPnlProbe = (fn: (chain: Chain) => number | null) => void (pnlProbe = fn);
export const LIVE_ACCT: Partial<Record<Chain, LiveAcct>> = {};
// When the demo account is replaced, keep a copy so signing out can put it back.
const DEMO: Partial<Record<Chain, ChainData>> = {};
const loadedFor: Partial<Record<Chain, string>> = {};

/* Has the first account read for the wallet in use finished? Until then the screens show "Loading your account" (never "$0.00" or
   an empty list, which would claim there is nothing). "failed" = the last read for this wallet failed (it retries every 30 s). */
export type AccountReadState = "loading" | "failed" | "ready";
const readFailed: Partial<Record<Chain, string>> = {};
const readSubs = new Set<() => void>();
let readTick = 0;
const readChanged = () => {
  readTick++;
  readSubs.forEach((f) => f());
};
export function accountReadState(chain: Chain): AccountReadState {
  const w = inUseWallet(chain);
  if (!w || w.sample) return "ready";
  if (loadedFor[chain] === w.full) return "ready";
  return readFailed[chain] === w.full ? "failed" : "loading";
}
export function useAccountRead(chain: Chain = "solana"): AccountReadState {
  // re-render when a read finishes or the wallet in use changes
  useSyncExternalStore((f) => (readSubs.add(f), () => void readSubs.delete(f)), () => readTick, () => readTick);
  useSyncExternalStore(onWalletsChanged, () => walletState(), () => walletState());
  return accountReadState(chain);
}

const today = () => new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });

function replace(chain: Chain, next: ChainData, live: LiveAcct | null) {
  mutate(() => {
    if (!DEMO[chain]) DEMO[chain] = JSON.parse(JSON.stringify(DATA[chain]));
    Object.assign(DATA[chain], next);
    if (live) LIVE_ACCT[chain] = live;
    else delete LIVE_ACCT[chain];
  });
}

export const setLiveAccount = replace;

function restoreDemo(chain: Chain) {
  const demo = DEMO[chain];
  if (!demo) return;
  mutate(() => {
    Object.assign(DATA[chain], JSON.parse(JSON.stringify(demo)));
    delete LIVE_ACCT[chain];
  });
  delete DEMO[chain];
}

const empty = (): ChainData => ({
  wallet: {},
  margin: { coll: [], debt: [], avail: {}, interestPaid: 0, created: null },
  spot: [],
  perps: [],
  phoenixIdle: 0,
  farm: [],
  lend: [],
  realized: 0,
});

// Decoded transactions are saved on the phone per wallet, so a restart reads only signatures it has not seen.
// v6: older versions saved every transaction as "no rows" (decoded before the margin address was derived from the owner, and with
// a hex read that fails on the phone's Buffer), and a signature is never re-read once cached.
const txCacheKey = (owner: string) => `vanna.txcache.v7.solana.${owner}`;
const seeded = new Set<string>();
async function seedTxCache(owner: string) {
  if (seeded.has(owner)) return;
  seeded.add(owner);
  try {
    const raw = await AsyncStorage.getItem(txCacheKey(owner));
    if (raw) seedHistoryCache(owner, JSON.parse(raw) as [string, ChainRow[]][]);
  } catch {}
}
function saveTxCache(owner: string, h: ChainHistory) {
  AsyncStorage.setItem(txCacheKey(owner), JSON.stringify(historyCacheFor(owner, h.sigs.slice(0, 400)))).catch(() => {});
}

// # Ported from: apps/solana/lib/solana/lend.ts, phoenix-state.ts, kamino.ts, perena.ts, history.ts:loadSolana
async function loadSolana(owner: string, onFast?: (d: ChainData, live: LiveAcct | null) => void) {
  // The margin account is a PDA of the wallet, so everything can start at once: balances and margin, positions and the transaction
  // history are read in parallel instead of one after another.
  const marginAddr = findPda(["margin", decode58(owner)], VANNA_PROGRAM_ID);
  const accP = fetchSolanaAccount(owner);
  const posP = fetchSolanaPositions(owner, marginAddr);
  const histP = seedTxCache(owner)
    .then(() => fetchSolanaHistory(owner, marginAddr))
    .catch((e) => {
      console.warn("[account] history read failed", String(e));
      return null;
    });
  const acc = await accP;
  const margin = acc.margin?.address ?? null;
  // First paint: wallet balances and the margin account are known now; positions and history may still be loading.
  if (onFast) {
    const q = empty();
    q.wallet = acc.wallet;
    let ql: LiveAcct | null = null;
    if (acc.margin) {
      const m = acc.margin;
      q.margin.created = today();
      for (const [k, b] of Object.entries(m.collateral)) q.margin.coll.push({ sym: k, amt: b.amount });
      for (const [k, b] of Object.entries(m.debt)) q.margin.debt.push({ sym: k, amt: b.amount });
      q.margin.phUsd = m.phUsd;
      ql = { hf: m.healthFactor, debtUsd: m.debtUsd, equity: m.netAvailableCollateral, lev: m.leverage, collUsd: m.collateralUsd, address: m.address };
    }
    onFast(q, ql);
  }
  const [positions, hist] = await Promise.all([posP, histP]);
  void margin;
  const d = empty();
  d.wallet = acc.wallet;
  d.lend = positions.lend;
  d.perps = positions.perps;
  d.phoenixIdle = positions.phoenixIdle;
  d.farm = positions.farm;
  let live: LiveAcct | null = null;
  if (acc.margin) {
    const m = acc.margin;
    d.margin.created = today();
    for (const [k, b] of Object.entries(m.collateral)) d.margin.coll.push({ sym: k, amt: b.amount });
    for (const [k, b] of Object.entries(m.debt)) d.margin.debt.push({ sym: k, amt: b.amount });
    d.margin.phUsd = m.phUsd;
    live = { hf: m.healthFactor, debtUsd: m.debtUsd, equity: m.netAvailableCollateral, lev: m.leverage, collUsd: m.collateralUsd, address: m.address };
    const created = hist?.rows.find((r) => r.type === "create");
    if (created) d.margin.created = new Date(created.ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  const prices = acc.prices ?? {};
  applyHistoryFigures(d, hist, !!acc.margin, positions.phoenixCash, (s) => prices[s] ?? 0);
  if (hist) saveTxCache(owner, hist);
  // what each deposit / withdrawal was worth when it happened (price ledger), for the margin account's Net P&L
  let ledger: PxLedger | null = null;
  let added = false;
  let firstRead = false;
  // (read even before a margin account exists, so rows from the account's first transactions count as seen live, not as old)
  if (hist) {
    try {
      const prev = await loadLedger(owner);
      firstRead = prev === "fresh";
      const o = observeRows(prev, hist.rows, (s) => prices[s] ?? 0);
      ledger = o.ledger;
      added = o.added;
      d.margin.netDeposits = netDepositsUsd(hist, (sig, sym) => ledger!.px[sig]?.[sym] ?? null);
    } catch {
      d.margin.netDeposits = null;
    }
  } else d.margin.netDeposits = null;
  if (ledger) d.margin.pnlSnaps = pnlPoints(ledger, hist!);
  return { d, live, hist, ledger, added, firstRead };
}

/** A real build never shows the design's sample user: positions, history, notifications and the sample profile all start empty. */
export function clearSampleData() {
  Object.assign(DATA.solana, empty());
  ACTIVITY.solana.length = 0;
  PERP_HIST.length = 0;
  NOTES.length = 0;
  const syncProfile = () => {
    ACCOUNT.email = "";
    ACCOUNT.wallets.solana = { ...ACCOUNT.wallets.solana, addr: inUseWallet("solana")?.addr ?? "" };
    // The name you picked, else your wallet. Never the design's sample name.
    AsyncStorage.getItem("vanna.name")
      .catch(() => null)
      .then((saved) => {
        const who = saved ?? inUseWallet("solana")?.addr;
        if (who && rewardsNow().name === "Maya") setRewards({ name: who });
      });
  };
  syncProfile();
  onWalletsChanged(syncProfile);
}

async function readOnce(chain: Chain) {
  const w = inUseWallet(chain);
  if (!w || w.sample) {
    if (loadedFor[chain]) restoreDemo(chain);
    delete loadedFor[chain];
    readChanged();
    return;
  }
  try {
    const { d, live, hist, ledger, added, firstRead } = await loadSolana(w.full, (qd, ql) => {
      // only for the first read of this wallet, and only if it is still the one in use: later refreshes keep the fuller data on screen
      if (loadedFor[chain] !== w.full && inUseWallet(chain)?.full === w.full) replace(chain, qd, ql);
    });
    // the wallet may have changed while reading
    if (inUseWallet(chain)?.full !== w.full) return;
    replace(chain, d, live);
    if (hist) snapshotPnl(chain, w.full, hist, ledger, added, firstRead);
    // this wallet's transaction history: what the chain shows (every refresh: only new signatures are read), plus rows the
    // phone saved that the chain does not list (yet). Without a chain read, the saved rows alone (once per wallet).
    if (hist) void loadActivity(chain, w.full, toActivity(hist.rows), true);
    else if (loadedFor[chain] !== w.full) void loadActivity(chain, w.full, []);
    // The Perps trades the phone saved, then the chain's own orders (market, side, size, hash) merged in.
    void loadPerpHist(w.full)
      .then(() => (hist ? perpHistFromChain(hist.rows).then((rows) => mergeChainPerpHist(w.full, rows)) : undefined))
      .catch(() => {});
    loadedFor[chain] = w.full;
    delete readFailed[chain];
    readChanged();
  } catch (e) {
    console.warn("[account] read failed", chain, String(e));
    readFailed[chain] = w.full;
    readChanged();
  }
}

const pnlPoints = (ledger: PxLedger, hist: ChainHistory): [number, number][] => {
  const created = hist.rows.find((r) => r.type === "create");
  return [...(created ? ([[created.ms, 0]] as [number, number][]) : []), ...ledger.snaps];
};

// After a read: one P&L point per new event (and one every 10 minutes), so the chart has a real line.
function snapshotPnl(chain: Chain, owner: string, hist: ChainHistory, ledger: PxLedger | null, added: boolean, firstRead: boolean) {
  const v = pnlProbe?.(chain) ?? null;
  if (!ledger) return;
  if (v != null && addSnap(ledger, Date.now(), v, added && !firstRead)) added = true;
  if (added) saveLedger(owner, ledger);
  mutate(() => {
    if (DATA[chain].margin.created) DATA[chain].margin.pnlSnaps = pnlPoints(ledger, hist);
  });
}

// A refresh that arrives while one is already reading (the 30 s timer, say) used to be thrown away, and that read could have
// started before the tokens landed. Now it queues one more read right after, so new balances show as soon as the chain has them.
const running: Partial<Record<Chain, Promise<void>>> = {};
const again: Partial<Record<Chain, boolean>> = {};
export function refreshAccount(chain: Chain): Promise<void> {
  const busy = running[chain];
  if (busy) {
    again[chain] = true;
    return busy;
  }
  const run = (async () => {
    do {
      again[chain] = false;
      await readOnce(chain);
    } while (again[chain]);
  })().finally(() => delete running[chain]);
  running[chain] = run;
  return run;
}

// After sending or receiving: read now, then twice more, because the chain can take a few seconds to show the new figures.
export function refreshAccountSoon(chain: Chain) {
  void refreshAccount(chain);
  setTimeout(() => void refreshAccount(chain), 3000);
  setTimeout(() => void refreshAccount(chain), 8000);
}

const refreshAll = () => {
  refreshAccount("solana");
};

let timer: ReturnType<typeof setInterval> | null = null;
export function startAccountLive() {
  if (timer) return () => {};
  // The design's sample user (Maya's balances, positions, history, notifications) never shows for a real wallet, not even while the
  // first read is running or when it fails.
  if (REAL_BUILD) mutate(clearSampleData);
  refreshAll();
  timer = setInterval(() => AppState.currentState === "active" && refreshAll(), 30_000);
  const off = onWalletsChanged(refreshAll);
  const sub = AppState.addEventListener("change", (s) => s === "active" && refreshAll());
  return () => {
    if (timer) clearInterval(timer);
    timer = null;
    off();
    sub.remove();
  };
}
