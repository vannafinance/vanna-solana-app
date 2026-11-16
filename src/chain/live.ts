import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { type Pool, POOLS_BY, PX } from "@/sample/data";
import { mutate } from "@/state/store";

import { PERP_MKTS } from "@/screens/trade/perps";

import { PERP_MARK } from "./perp-mark";
import { fetchKamino, fetchPerena } from "./solana/farm";
import { fetchPhoenixMarkets } from "./solana/phoenix";
import { readAllAssetConfigs, TOKENS } from "./solana/actions";
import { ensureFreshForkPrices } from "./solana/fork-prices";
import { fetchSolanaPools } from "./solana/pools";
import { fetchSolanaPrices } from "./solana/prices";
import { VAULTS, usdC } from "@/screens/farm/farm";

// Live chain data feeding the app's data layer, read straight from the chain (no Vanna web server):
// - Earn pools: supplied, borrowed, utilisation, borrow and supply rates.
// - Token prices from the Vanna oracle's price book (Scope, then Pyth).
// Values match test.vanna.finance (checked 2026-11-05). Refreshed every 30 s while the app is open; when a read fails
// the last numbers stay. Wallet balances, margin accounts and positions are per account and arrive with sign-in.
type Part = "solanaPools" | "solanaPrices";
type Status = Record<Part, number | null>;
let status: Status = { solanaPools: null, solanaPrices: null };
const subs = new Set<() => void>();
const mark = (p: Part) => ((status = { ...status, [p]: Date.now() }), subs.forEach((f) => f()));
export const useLiveStatus = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => status,
  );

const putPools = (live: Pool[]) => {
  for (const p of live) {
    const i = POOLS_BY.solana.findIndex((x) => x.sym === p.sym);
    if (i >= 0) POOLS_BY.solana[i] = p;
  }
};

// Solana Farm cards: Kamino reserves, Perena's 7-day APY and share price. Perps markets from Phoenix's live market feed.
async function refreshSolanaFarm() {
  const markets = async () => {
    const live = await fetchPhoenixMarkets(PERP_MKTS.map((m) => m.k));
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
  };
  const [k, p] = await Promise.allSettled([fetchKamino(), fetchPerena(), markets()]);
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
  });
}

// Fork prices expire after an hour unless someone rewrites them. Without this the app showed the design's sample prices.
let keeperAt = 0;
function keepForkPricesFresh(): Promise<unknown> {
  if (Date.now() - keeperAt < 20 * 60_000) return Promise.resolve();
  keeperAt = Date.now();
  const work = readAllAssetConfigs()
    .then((assets) => ensureFreshForkPrices(TOKENS, assets))
    .catch((e: unknown) => {
      keeperAt = 0;
      console.warn("[live] price refresh failed", String(e));
    });
  return Promise.race([work, new Promise((r) => setTimeout(r, 8000))]);
}

async function refresh() {
  await keepForkPricesFresh();
  refreshSolanaFarm();
  const [sp, spx] = await Promise.allSettled([fetchSolanaPools(), fetchSolanaPrices()]);
  [sp, spx].forEach((r, i) => r.status === "rejected" && console.warn("[live] read failed", ["solanaPools", "solanaPrices"][i], String(r.reason)));
  mutate(() => {
    if (sp.status === "fulfilled" && sp.value.length) putPools(sp.value);
    if (spx.status === "fulfilled") Object.assign(PX, spx.value);
  });
  if (sp.status === "fulfilled") mark("solanaPools");
  if (spx.status === "fulfilled") mark("solanaPrices");
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
