import { assetConfigPda } from "@/chain/solana/actions";
import { RESERVES } from "@/chain/solana/config";
import { shareMintOf } from "@/chain/solana/pools";
import { ASSET_RISK } from "@/chain/solana/risk";
import { nf, tokFmt } from "@/format";
import { ACTIVITY, DATA, type Pool, POOLS_BY, PX, TOK } from "@/sample/data";
import { lendTotals } from "@/sample/model";
import type { Chain } from "@/state/chain";

/* Earn helpers (design screens/earn.js): vault categories, vToken shares, free liquidity, the rate curve, and supply / withdraw on the
   sample state. */

export const CATS = ["xStocks", "PreStocks", "Crypto", "Stablecoins"] as const;
const STOCK = new Set(["TSLAx", "AAPLx", "GOOGLx", "NVDAx"]), PRE = new Set(["ANTHROPIC", "OPENAI"]);
export const catOf = (s: string) => (TOK[s]?.stable ? "Stablecoins" : PRE.has(s) ? "PreStocks" : STOCK.has(s) ? "xStocks" : "Crypto");
export const nameOf = (_chain: Chain, s: string) => TOK[s]?.name ?? s;
export const isStable = (s: string) => !!TOK[s]?.stable;
export const shareSym = (s: string) => "v" + s;
// Underlying per vToken, read from the chain (lender total / share supply); null until a live read has it.
export const shareRate = (chain: Chain, s: string): number | null => {
  const p = poolOf(chain, s);
  return p?.live && p.rate ? p.rate : null;
};
export const freeTok = (p: Pool) => Math.max(0, p.sup - p.bor);
export const decOf = (s: string) => (isStable(s) ? 2 : 4);
// Digits a person may type / Max fills: the token's own decimals (so Max empties a position), not the 2-4 digit display.
export const inDecOf = (s: string) => RESERVES[s]?.decimals ?? decOf(s);
// vTokens for an amount, as the program rounds them (shares.rs: supply = floor, withdraw = ceil), shown to 4 digits.
export const sharesFor = (x: number, rate: number, up: boolean) => {
  const v = (x / rate) * 1e4;
  return (up ? Math.ceil(v - 1e-6) : Math.floor(v + 1e-6)) / 1e4;
};
export const poolOf = (chain: Chain, s: string) => POOLS_BY[chain].find((p) => p.sym === s);
export const lendOf = (chain: Chain, s: string) => DATA[chain].lend.find((l) => l.sym === s) ?? null;
export const balTok = (l: { amt: number; earned: number } | null) => (l ? l.amt + l.earned : 0);
export const px = (s: string) => PX[s] ?? 0;

// compact numbers (shipped format-earn)
export const cNum = (n: number) => {
  const a = Math.abs(n);
  return a >= 1e6 ? nf(n / 1e6, 2) + "M" : a >= 1e3 ? nf(n / 1e3, 1) + "K" : nf(n, 2);
};
export const cUsd = (n: number) => "$" + cNum(n);
export const fullAmt = (n: number, s: string) => tokFmt(n, s);

export function earnTotals(chain: Chain) {
  const L = DATA[chain].lend;
  const val = L.reduce((t, l) => t + balTok(l) * px(l.sym), 0);
  const earned = L.reduce((t, l) => t + l.earned * px(l.sym), 0);
  return { val, earned, apy: L.length ? lendTotals(chain).apy : 0, n: L.length };
}

// The reserve's own rate curve (on-chain interest.rs, web math.ts): borrow APR = mult x (u x linear + u^32 x linear + u^64 x jump),
// lenders earn borrow x utilisation x (1 - reserve factor). Null until the pool has been read from the chain.
export function rateCurve(p: Pool) {
  if (!p.live || !p.curve) return null;
  const { l, j, m } = p.curve, rf = (p.rf ?? 0) / 100;
  const borrow = (u: number) => m * (u * l + Math.pow(u, 32) * l + Math.pow(u, 64) * j);
  const lender = (u: number) => borrow(u) * u * (1 - rf);
  const u0 = p.util / 100;
  const samples = Array.from({ length: 101 }, (_, i) => ({ u: i / 100, b: borrow(i / 100), l: lender(i / 100) }));
  return { samples, cur: { u: u0, b: borrow(u0), l: lender(u0) } };
}

// Collateral rules shown on a vault, from the program's AssetConfig accounts (chain/solana/risk.ts, filled by live.ts):
// [asset, collateral enabled, borrow enabled, liquidation bonus %, LTV %, liquidation threshold %]. Empty until read.
export const collList = (_chain: Chain): [string, boolean, boolean, number, number, number][] =>
  Object.values(ASSET_RISK).map((r) => [r.sym, r.collateral, r.borrow, r.liqBonus, r.ltv, r.liqThreshold]);

// The vault's on-chain accounts: [label, short form, full address]. Reserve from config.ts, share mint and asset config are
// program PDAs (seeds "share_mint" / "asset" + mint), the price account is the oracle's Pyth feed (else its Scope account).
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const addrCache: Record<string, [string, string][]> = {};
export function addrsOf(s: string): [string, string, string][] {
  const r = RESERVES[s];
  if (!r) return [];
  addrCache[s] ??= [["Reserve", r.reserve], ["vToken mint", shareMintOf(r.mint)], ["Asset config", assetConfigPda(r.mint)], ["Token mint", r.mint]];
  const feed = ASSET_RISK[s]?.priceFeed;
  const rows: [string, string][] = [...addrCache[s], ...(feed ? [["Price feed", feed] as [string, string]] : [])];
  return rows.map(([l, a]) => [l, short(a), a]);
}

const now = () => {
  const d = new Date();
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const randTx = () => {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
  const r = (n: number) => Array.from({ length: n }, () => a[Math.floor(Math.random() * a.length)]).join("");
  return r(4) + "…" + r(4);
};

// Supply / withdraw on the sample state (the TX sheet calls this inside mutate()).
export function applyEarn(chain: Chain, s: string, x: number, mode: "supply" | "withdraw") {
  const d = DATA[chain], pool = poolOf(chain, s);
  const amt = fullAmt(x, s);
  if (mode === "supply") {
    d.wallet[s] = Math.max(0, (d.wallet[s] ?? 0) - x);
    const l = lendOf(chain, s);
    if (l) l.amt += x;
    else d.lend.push({ sym: s, amt: x, earned: 0, since: "Oct 7" });
    if (pool) {
      pool.sup += x;
      pool.util = pool.sup ? (pool.bor / pool.sup) * 100 : 0;
    }
  } else {
    d.wallet[s] = (d.wallet[s] ?? 0) + x;
    const l = lendOf(chain, s);
    if (l) {
      l.amt -= x;
      if (l.amt < 0) {
        l.earned = Math.max(0, l.earned + l.amt);
        l.amt = 0;
      }
      if (l.amt + l.earned < 1e-6) d.lend.splice(d.lend.indexOf(l), 1);
    }
    if (pool) {
      pool.sup = Math.max(pool.bor, pool.sup - x);
      pool.util = pool.sup ? (pool.bor / pool.sup) * 100 : 0;
    }
  }
  ACTIVITY[chain].unshift({ t: now(), area: "Earn", action: mode === "supply" ? "Supply" : "Withdraw", detail: `${s} pool`, amt: (mode === "supply" ? "+" : "−") + amt, usd: x * px(s), tx: "", sym: s });
}

export { randTx, now as nowT };
