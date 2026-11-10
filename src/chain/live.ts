import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { type Pool, POOLS_BY, PX } from "@/sample/data";
import { mutate } from "@/state/store";

import { PERP_MKTS } from "@/screens/trade/perps";

import { PERP_MARK } from "./perp-mark";
import { fetchFundingNow, fetchKamino, fetchPerena } from "./solana/farm";
import { fetchPhoenixMarkets, HOURS_PER_YEAR } from "./solana/phoenix";
import { fetchSolanaPools } from "./solana/pools";
import { fetchSolanaPrices } from "./solana/prices";
import { usd } from "@/format";
import { VAULTS, usdC } from "@/screens/farm/farm";

import { fetchBlendReserves, fetchLpTvl } from "./stellar/farm";
import { fetchStellarPools } from "./stellar/pools";
import { fetchStellarPrices } from "./stellar/prices";

// Live chain data feeding the app's data layer, read straight from the chains (no Vanna web server):
// - Earn pools on both chains: supplied, borrowed, utilisation, borrow and supply rates.
// - Token prices on both chains: Solana from the Vanna oracle's price book (Scope, then Pyth), Stellar from the oracle.
// Values match test.vanna.finance (checked 2026-11-05). Refreshed every 30 s while the app is open; when a read fails
// the last numbers stay. Wallet balances, margin accounts and positions are per account and arrive with sign-in.
type Part = "solanaPools" | "stellarPools" | "solanaPrices" | "stellarPrices";
type Status = Record<Part, number | null>;
let status: Status = { solanaPools: null, stellarPools: null, solanaPrices: null, stellarPrices: null };
const subs = new Set<() => void>();
const mark = (p: Part) => ((status = { ...status, [p]: Date.now() }), subs.forEach((f) => f()));
export const useLiveStatus = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => status,
  );

const putPools = (chain: "solana" | "stellar", live: Pool[]) => {
  for (const p of live) {
    const i = POOLS_BY[chain].findIndex((x) => x.sym === p.sym);
    if (i >= 0) POOLS_BY[chain][i] = p;
  }
};

// Stellar Farm cards: Blend reserves (supply APY, deposits in USD, utilisation) and the LP pools.
// LP TVL is reserves × the oracle price. Soroswap APR is 0 (no testnet source). Aquarius APR is its AMM API.
async function refreshStellarFarm() {
  const [blend, lp] = await Promise.allSettled([fetchBlendReserves(), fetchLpTvl()]);
  if (blend.status === "rejected") console.warn("[live] read failed stellarFarm", String(blend.reason));
  mutate(() => {
    const v = (id: string) => VAULTS.stellar.find((x) => x.id === id);
    if (blend.status === "fulfilled") {
      for (const [id, k, px] of [["blend-xlm", "XLM", PX.XLM], ["blend-usdc", "USDC", PX.BLUSDC ?? 1]] as const) {
        const r = blend.value[k], t = v(id);
        if (!t) continue;
        t.apy = +r.supplyApy.toFixed(2);
        t.a = ["Total deposits", usdC(r.supplied * (px ?? 0))];
        t.b = ["Utilization", r.util.toFixed(2) + "%"];
        t.util = r.util;
        t.supplyUsd = r.supplied * (px ?? 0);
        t.borrowUsd = r.borrowed * (px ?? 0);
        t.borrowApy = +r.borrowApy.toFixed(2);
      }
    }
    if (lp.status === "fulfilled") {
      const s = v("soroswap-xlm"), a = v("aquarius-xlm");
      if (s) {
        s.supplyUsd = lp.value.soroswap.tvl;
        s.a = ["TVL", usd(lp.value.soroswap.tvl)];
        s.apy = lp.value.soroswap.apr;
      }
      if (a) {
        a.supplyUsd = lp.value.aquarius.tvl;
        a.a = ["TVL", usd(lp.value.aquarius.tvl)];
        a.apy = +lp.value.aquarius.apr.toFixed(2);
      }
    }
  });
}

// Solana Farm cards: Kamino reserves, Perena's 7-day APY and share price, basis vaults' funding now. Basis 7-day APY and
// the vaults' TVL come from the web server's own NAV history and a fork simulation, so those keep the designed values.
async function refreshSolanaFarm() {
  const basis = VAULTS.solana.filter((v) => v.cat === "dn");
  const sym = (id: string) => id.replace("basis-", "").toUpperCase();
  // Funding now: Phoenix's live market feed (what the site shows), else the latest published hourly rate.
  const funding = async () => {
    const syms = [...new Set([...basis.map((v) => sym(v.id)), ...PERP_MKTS.map((m) => m.k)])];
    const live = await fetchPhoenixMarkets(syms);
    mutate(() => {
      for (const m of PERP_MKTS) {
        const x = live[m.k];
        if (!x) continue;
        // Perps price from Phoenix's mark (perpMark in perp-mark.ts falls back to PX until this arrives)
        m.mark = x.markPx;
        PERP_MARK[m.k] = x.markPx;
        if (x.oraclePx !== null) m.oracle = x.oraclePx;
        if (x.fundingHourlyPct !== null) m.fund = x.fundingHourlyPct;
        if (x.openInterest !== null) m.oi = x.openInterest * x.markPx;
        if (x.dayVolumeUsd !== null) m.vol = x.dayVolumeUsd;
        if (x.prevDayPx) m.ch = ((x.markPx - x.prevDayPx) / x.prevDayPx) * 100;
      }
    });
    const missing = syms.filter((s) => live[s]?.fundingHourlyPct == null);
    const rest = missing.length ? await fetchFundingNow(missing).catch(() => ({}) as Record<string, number>) : {};
    const out: Record<string, number> = { ...rest };
    for (const [s, x] of Object.entries(live)) if (x.fundingHourlyPct !== null) out[s] = x.fundingHourlyPct * HOURS_PER_YEAR;
    return out;
  };
  const [k, p, f] = await Promise.allSettled([fetchKamino(), fetchPerena(), funding()]);
  if (k.status === "rejected") console.warn("[live] read failed kamino", String(k.reason));
  mutate(() => {
    const v = (id: string) => VAULTS.solana.find((x) => x.id === id);
    if (k.status === "fulfilled")
      for (const s of ["SOL", "USDC", "USDT"] as const) {
        const r = k.value[s], t = v(`kamino-${s.toLowerCase()}`);
        if (!r || !t) continue;
        t.apy = +r.supplyApy.toFixed(2);
        t.a = ["Total deposits", usdC(r.supplyUsd)];
        t.b = ["Utilization", r.util.toFixed(2) + "%"];
        t.util = r.util;
        t.supplyUsd = r.supplyUsd;
        t.borrowUsd = r.borrowUsd;
        if (r.borrowApy !== null) t.borrowApy = +r.borrowApy.toFixed(2);
      }
    if (p.status === "fulfilled")
      for (const [id, key] of [["usdstar", "usdstar"], ["junior", "junior"]] as const) {
        const r = p.value[key], t = v(id);
        if (!t) continue;
        // Share price stays the fork's own NAV (the site shows that, not Perena's mainnet price).
        if (r.apy7 !== null) t.apy = +r.apy7.toFixed(2);
      }
    if (f.status === "fulfilled")
      for (const t of basis) {
        const apr = f.value[sym(t.id)];
        if (apr !== undefined) {
          t.b = ["Funding now", (apr >= 0 ? "+" : "") + apr.toFixed(1) + "%"];
          t.fundingNow = apr;
        }
      }
  });
}

async function refresh() {
  refreshSolanaFarm();
  const [sp, xp, spx, xpx] = await Promise.allSettled([fetchSolanaPools(), fetchStellarPools(), fetchSolanaPrices(), fetchStellarPrices()]);
  [sp, xp, spx, xpx].forEach((r, i) => r.status === "rejected" && console.warn("[live] read failed", ["solanaPools", "stellarPools", "solanaPrices", "stellarPrices"][i], String(r.reason)));
  mutate(() => {
    if (sp.status === "fulfilled" && sp.value.length) putPools("solana", sp.value);
    if (xp.status === "fulfilled" && xp.value.length) putPools("stellar", xp.value);
    if (spx.status === "fulfilled") Object.assign(PX, spx.value);
    if (xpx.status === "fulfilled") Object.assign(PX, xpx.value);
  });
  if (sp.status === "fulfilled") mark("solanaPools");
  if (xp.status === "fulfilled") mark("stellarPools");
  if (spx.status === "fulfilled") mark("solanaPrices");
  if (xpx.status === "fulfilled") mark("stellarPrices");
  // Blend deposits and LP TVL are priced in USD, so they wait for this round's prices.
  refreshStellarFarm();
}

let timer: ReturnType<typeof setInterval> | null = null;
export function startLiveData() {
  if (timer) return () => {};
  refresh();
  timer = setInterval(() => AppState.currentState === "active" && refresh(), 30_000);
  const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
  return () => {
    if (timer) clearInterval(timer);
    timer = null;
    sub.remove();
  };
}
