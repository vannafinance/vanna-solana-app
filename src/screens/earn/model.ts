import { nf, tokFmt } from "@/format";
import { ACTIVITY, DATA, type Pool, POOLS_BY, PX, TOK } from "@/sample/data";
import { lendTotals } from "@/sample/model";
import type { Chain } from "@/state/chain";

/* Earn helpers (design screens/earn.js): vault categories, vToken shares, free liquidity, the rate curve, and supply / withdraw on the
   sample state. */

export const CATS = ["xStocks", "PreStocks", "Crypto", "Stablecoins"] as const;
const STOCK = new Set(["TSLAx", "AAPLx", "GOOGLx", "NVDAx"]), PRE = new Set(["ANTHROPIC", "OPENAI"]);
export const catOf = (s: string) => (TOK[s]?.stable ? "Stablecoins" : PRE.has(s) ? "PreStocks" : STOCK.has(s) ? "xStocks" : "Crypto");
export const nameOf = (chain: Chain, s: string) => (TOK[s]?.name ?? s) + (chain === "stellar" ? " on Blend" : "");
export const isStable = (s: string) => !!TOK[s]?.stable;
export const shareSym = (s: string) => "v" + s;
export const shareRate = (chain: Chain, s: string) => poolOf(chain, s)?.rate ?? 1 + ((poolOf(chain, s)?.supA ?? 4) / 100) * 0.13;
export const freeTok = (p: Pool) => Math.max(0, p.sup - p.bor);
export const decOf = (s: string) => (isStable(s) ? 2 : 4);
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

// Rate model: the borrow rate rises gently to the kink (80% used), steeply after; lenders earn borrow x utilization, scaled to today's APY.
export function rateCurve(p: Pool) {
  const u0 = Math.max(0.01, p.util / 100), b0 = p.borA / 100, kink = 0.8;
  const bk = u0 <= kink ? (b0 * kink) / u0 : b0 - ((u0 - kink) / (1 - kink)) * 0.6, bmax = bk + 0.6;
  const borrow = (u: number) => (u <= kink ? (bk * u) / kink : bk + ((bmax - bk) * (u - kink)) / (1 - kink));
  const k = p.supA / 100 / (borrow(u0) * u0 || 1);
  const lender = (u: number) => borrow(u) * u * k;
  const samples = Array.from({ length: 101 }, (_, i) => ({ u: i / 100, b: borrow(i / 100), l: lender(i / 100) }));
  return { samples, kink: { u: kink, b: borrow(kink) }, cur: { u: u0, b: borrow(u0), l: lender(u0) } };
}

// Collateral rules shown on a vault (sample): [asset, collateral, borrowable, liquidation bonus %]
export const COLL: Record<Chain, [string, boolean, boolean, number][]> = {
  solana: [["SOL", true, true, 5], ["USDC", true, true, 2.5], ["USDT", true, true, 2.5], ["ETH", true, true, 5], ["BTC", true, false, 5], ["TSLAx", true, false, 7.5], ["OPENAI", true, false, 10]],
  stellar: [["XLM", true, true, 5], ["USDC", true, true, 2.5]],
};

export const ADDR: Record<Chain, [string, string][]> = {
  solana: [["Vault", "VnUS…kQ2"], ["vToken mint", "vUSD…N8w"], ["Pyth price feed", "Gnt2…Z4Hp"]],
  stellar: [["Blend pool", "CCEB…4HGF"], ["vToken", "CBLU…BLND"], ["Reflector oracle", "CAVL…6HLP"]],
};

const now = () => {
  const d = new Date();
  return `Oct 7, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  ACTIVITY[chain].unshift({ t: now(), area: "Earn", action: mode === "supply" ? "Supply" : "Withdraw", detail: `${s} pool`, amt: (mode === "supply" ? "+" : "−") + amt, usd: x * px(s), tx: randTx(), sym: s });
}

export { randTx, now as nowT };
