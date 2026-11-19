import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { DATA, type Pool, POOLS_BY, PX } from "@/sample/data";
import { mutate } from "@/state/store";

import { PERP_MKTS } from "@/screens/trade/perps";

import { PERP_MARK } from "./perp-mark";
import { fetchKamino, fetchPerena, fetchPerenaFork } from "./solana/farm";
import { fetchPhoenixMarkets } from "./solana/phoenix";
import { readAllAssetConfigs, readPerpMaxLeverage, TOKENS } from "./solana/actions";
import { ensureFreshForkPrices } from "./solana/fork-prices";
import { fetchSolanaPools } from "./solana/pools";
import { fetchSolanaPrices } from "./solana/prices";
import { ASSET_RISK, riskFrom } from "./solana/risk";
import { VAULT_CATALOGUE_APYS } from "./solana/tokens";
import { nf } from "@/format";
import { VAULTS, usdC } from "@/screens/farm/farm";

// Live chain data feeding the app's data layer, read straight from the chain (no Vanna web server):
// - Earn pools: supplied, borrowed, utilisation, borrow and supply rates.
// - Token prices from the Vanna oracle's price book (Scope, then Pyth).
// Values match test.vanna.finance (checked 2026-11-05). Refreshed every 30 s while the app is open; when a read fails
// the last real numbers stay. Before the first successful read nothing is invented: pools, farm vaults and asset risk start
// empty and the screens show "—" (Pool.live, Vault.apyLive, ASSET_RISK). `useLiveStatus` holds the time of each part's last
// good read (null = never). Wallet balances, margin accounts and positions are per account and arrive with sign-in.
type Part = "solanaPools" | "solanaPrices" | "solanaRisk" | "kamino" | "perena" | "perpMarkets";
type Status = Record<Part, number | null>;
let status: Status = { solanaPools: null, solanaPrices: null, solanaRisk: null, kamino: null, perena: null, perpMarkets: null };
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

let limitsAt = 0;
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
  // Max leverage per market follows Vanna's market book on chain (the order sheet's slider stops there). Read until it succeeds,
  // then every 10 minutes.
  const limits = async () => {
    if (Date.now() - limitsAt < 10 * 60_000) return;
    const max = await readPerpMaxLeverage();
    if (!Object.keys(max).length) return;
    limitsAt = Date.now();
    mutate(() => {
      for (const m of PERP_MKTS) if (max[m.k] !== undefined) m.max = max[m.k];
    });
  };
  const [k, p, pf, mk] = await Promise.allSettled([fetchKamino(), fetchPerena(), fetchPerenaFork(), markets(), limits().catch((e: unknown) => console.warn("[live] read failed perpLimits", String(e)))]);
  ([["kamino", k], ["perena", p], ["perenaFork", pf], ["perpMarkets", mk]] as const).forEach(([n, r]) => r.status === "rejected" && console.warn("[live] read failed", n, String(r.reason)));
  mutate(() => {
    const v = (id: string) => VAULTS.solana.find((x) => x.id === id);
    if (k.status === "fulfilled")
      for (const s of ["SOL", "USDC", "USDT"] as const) {
        const r = k.value[s], t = v(`kamino-${s.toLowerCase()}`);
        if (!r || !t) continue;
        t.apy = +r.supplyApy.toFixed(2);
        t.apyLive = true;
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
        if (r.apy7 !== null) {
          t.apy = +r.apy7.toFixed(2);
          t.apyLive = true;
        }
        if (r.holders !== null) t.holders = r.holders;
        if (r.price !== null) t.perenaPrice = r.price;
      }
    // Share price and TVL are the fork's own NAV (the site shows that, not Perena's mainnet price).
    if (pf.status === "fulfilled")
      for (const id of ["usdstar", "junior"]) {
        const r = pf.value[id], t = v(id);
        if (!r || !t) continue;
        t.sharePrice = r.sharePrice;
        t.tvlUsd = r.tvlUsd;
        t.a = ["TVL", usdC(r.tvlUsd)];
        t.b = ["Share price", "$" + nf(r.sharePrice, 4)];
      }
    // Positions read from the chain carry their vault's live APY (positions.ts reads VAULT_CATALOGUE_APYS).
    for (const t of VAULTS.solana) if (t.apyLive) VAULT_CATALOGUE_APYS[t.id] = t.apy;
    for (const f of DATA.solana.farm) if (VAULT_CATALOGUE_APYS[f.id] !== undefined) f.apy = VAULT_CATALOGUE_APYS[f.id];
  });
  if (k.status === "fulfilled") mark("kamino");
  if (p.status === "fulfilled" || pf.status === "fulfilled") mark("perena");
  if (mk.status === "fulfilled") mark("perpMarkets");
}

// Fork prices expire after an hour unless someone rewrites them. Without this the app showed the design's sample prices.
let keeperAt = 0;
function keepForkPricesFresh(): Promise<unknown> {
  if (Date.now() - keeperAt < 20 * 60_000) return Promise.resolve();
  keeperAt = Date.now();
  const work = readAllAssetConfigs()
    .then((assets) => {
      // Collateral rules, LTV, liquidation settings and oracle source per token (vault detail, Earn model).
      const risk = riskFrom(assets);
      if (Object.keys(risk).length) {
        mutate(() => Object.assign(ASSET_RISK, risk));
        mark("solanaRisk");
      } else keeperAt = 0; // the read failed (it returns an empty map): try again on the next refresh
      return ensureFreshForkPrices(TOKENS, assets);
    })
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
