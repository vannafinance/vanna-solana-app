import { nativeToScVal } from "@stellar/stellar-base";
import { AppState } from "react-native";

import { DATA, type ChainData, type FarmPos } from "@/sample/data";
import type { Chain } from "@/state/chain";
import { mutate } from "@/state/store";
import { inUseWallet, onWalletsChanged } from "@/state/wallets";

import { fetchSolanaAccount } from "./solana/account";
import { fetchSolanaPositions } from "./solana/positions";
import { APP_SYM, fetchStellarAccount } from "./stellar/account";
import { EARN_POOLS } from "./stellar/config";
import { fetchStellarPool } from "./stellar/pools";
import { readContract } from "./stellar/read";

/* The signed-in wallet's own figures, read from the chain and written into DATA[chain] (the shape every screen reads):
   wallet balances, Earn positions, margin collateral and debt. Health factor, debt, equity and leverage are the chain
   readers' figures (they match test.vanna.finance exactly); acct() in src/sample/model.ts uses them through LIVE_ACCT.
   Only a real wallet is read: with a stand-in (preview) wallet the screens show dashes (src/state/personal.ts) and DATA
   keeps the demo account. Refreshes when the wallet in use changes, every 30 s, and when the app comes back. */

export type LiveAcct = { hf: number; debtUsd: number; equity: number; lev: number; collUsd: number; k?: number };
export const LIVE_ACCT: Partial<Record<Chain, LiveAcct>> = {};
// When the demo account is replaced, keep a copy so signing out can put it back.
const DEMO: Partial<Record<Chain, ChainData>> = {};
const loadedFor: Partial<Record<Chain, string>> = {};

const app = (k: string) => APP_SYM[k] ?? k;
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

async function loadStellar(owner: string) {
  const [acc, lend] = await Promise.all([
    fetchStellarAccount(owner),
    // Earn: vToken balance x the pool's live exchange rate (website earn-form: shares x exchangeRate)
    Promise.all(
      Object.entries(EARN_POOLS).map(async ([sym, c]) => {
        // vTokens carry their own decimals (BLUSDC's are 6, not the 7 of Stellar assets): read them, as pools.ts does
        const [raw, dec] = await Promise.all([readContract(c.vToken, "balance", nativeToScVal(owner, { type: "address" })).catch(() => 0n), readContract(c.vToken, "decimals").catch(() => 7)]);
        const shares = Number(BigInt(raw as bigint)) / 10 ** Number(dec);
        if (!(shares > 0)) return null;
        const rate = (await fetchStellarPool(sym).catch(() => null))?.rate ?? 1;
        return { sym, amt: shares * rate, shares, earned: 0, since: "" };
      }),
    ),
  ]);
  const d = empty();
  d.wallet = acc.wallet;
  d.lend = lend.filter((x): x is NonNullable<typeof x> => x !== null);
  let live: LiveAcct | null = null;
  if (acc.margin) {
    const m = acc.margin;
    d.margin.created = today();
    for (const [k, b] of Object.entries(m.collateral)) {
      if (k === "SS_XLM_USDC" || k === "AQ_XLM_USDC") {
        // Farm LP shares held by the margin account, valued from the pool reserves (priced as USD via BLUSDC)
        const aq = k === "AQ_XLM_USDC";
        const f: FarmPos = { id: aq ? "aquarius-xlm" : "soroswap-xlm", kind: "lp", venue: aq ? "Aquarius" : "Soroswap", name: "XLM / USDC", sym: "BLUSDC", icon: "XLM", amt: b.usd, apy: 0, earned: 0, since: "" };
        d.farm.push(f);
      } else d.margin.coll.push({ sym: app(k), amt: b.amount });
    }
    for (const [k, b] of Object.entries(m.debt)) d.margin.debt.push({ sym: app(k), amt: b.amount });
    live = { hf: m.healthFactor, debtUsd: m.debtUsd, equity: m.netAvailableCollateral, lev: m.leverage, collUsd: m.grossCollateralUsd };
  }
  return { d, live };
}

// # Ported from: apps/solana/lib/solana/lend.ts, phoenix-state.ts, kamino.ts, perena.ts:loadSolana
async function loadSolana(owner: string) {
  const acc = await fetchSolanaAccount(owner);
  const positions = await fetchSolanaPositions(owner, acc.margin?.address ?? null);
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
    live = { hf: m.healthFactor, debtUsd: m.debtUsd, equity: m.netAvailableCollateral, lev: m.leverage, collUsd: m.collateralUsd };
  }
  return { d, live };
}

let running: Partial<Record<Chain, boolean>> = {};
export async function refreshAccount(chain: Chain) {
  const w = inUseWallet(chain);
  if (!w || w.sample) {
    if (loadedFor[chain]) restoreDemo(chain);
    delete loadedFor[chain];
    return;
  }
  if (running[chain]) return;
  running[chain] = true;
  try {
    const { d, live } = chain === "stellar" ? await loadStellar(w.full) : await loadSolana(w.full);
    // the wallet may have changed while reading
    if (inUseWallet(chain)?.full !== w.full) return;
    replace(chain, d, live);
    loadedFor[chain] = w.full;
  } catch (e) {
    console.warn("[account] read failed", chain, String(e));
  } finally {
    running[chain] = false;
  }
}

const refreshAll = () => {
  refreshAccount("stellar");
  refreshAccount("solana");
};

let timer: ReturnType<typeof setInterval> | null = null;
export function startAccountLive() {
  if (timer) return () => {};
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
