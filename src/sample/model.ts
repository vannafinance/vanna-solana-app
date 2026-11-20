// The design's sample account model (core.js acct, lendTotals, portfolioTotals). Not the risk engine: real numbers replace this
// when the chain adapters land, so screens read only the shapes returned here.

import { perpMark } from "@/chain/perp-mark";
import { LIVE_ACCT, setPnlProbe } from "@/chain/account-live";
import { lineBps, lineWeight } from "@/chain/solana/risk";
import type { Chain } from "@/state/chain";

import { type ChainData, DATA, type PerpPos, POOLS_BY, PX, type Side, type SpotPos, TOK } from "./data";

export const LIQ_HF = 1.1;
export const SAFE_FROM = 1.5;

const px = (s: string) => PX[s] ?? 0;
// every non-stable price times `scale` (price-room maths)
let SCALE = 1;
// one token priced on its own (liquidation price search)
let OVR: Record<string, number> = {};
const pxAt = (s: string) => OVR[s] ?? (isStable(s) ? px(s) : px(s) * SCALE);
// a perp is priced from Phoenix's mark (falls back to PX); price-room scale and a single-token override apply as for any volatile asset
const pxPerp = (s: string) => OVR[s] ?? perpMark(s) * SCALE;
const isStable = (s: string) => !!TOK[s]?.stable;

// Farm receipts (Kamino / Perena share tokens) are configured at LTV 50% / liquidation 60% on the fork.
const FARM_W = { liq: lineBps(6000), borrow: lineBps(5000) };
const sgn = (side: Side) => (side === "long" ? 1 : -1);

export const poolOf = (chain: Chain, sym: string) => POOLS_BY[chain].find((p) => p.sym === sym);
// a position read from Phoenix carries its real size; a sample or just-opened one is collateral x leverage / entry
export const perpQty = (p: PerpPos) => p.qty ?? (p.coll * p.lev) / p.entry;
export const perpPnl = (p: PerpPos) => sgn(p.side) * perpQty(p) * (perpMark(p.k) - p.entry);
export const spotPnl = (s: SpotPos) => sgn(s.side) * s.qty * (px(s.sym) - s.entry);
export const spotValue = (s: SpotPos) => s.qty * px(s.sym);

export const hasMargin = (d: ChainData) => !!d.margin.created;

// While a what-if copy is being read (previews), the chain's own figures must not replace the model's result.
let SIMMING = 0;
export function acct(chain: Chain, scale = 1) {
  const base = scale === 1 && Object.keys(OVR).length === 0 && SIMMING === 0;
  SCALE = scale;
  const d = DATA[chain];
  const m = d.margin;
  // phUSD waiting in the margin account (a perps open between its two transactions) counts like USDC, as the program counts it.
  const phUsd = (m.phUsd ?? 0) * pxAt("USDC");
  const collUsd = m.coll.reduce((t, c) => t + c.amt * pxAt(c.sym), 0) + phUsd;
  const availUsd = Object.entries(m.avail).reduce((t, [s, v]) => t + v * pxAt(s), 0);
  // the same holdings at each token's liquidation / borrow weight (tokens only: venues and Phoenix count at 100%)
  const wTok = (line: "liq" | "borrow") =>
    m.coll.reduce((t, c) => t + c.amt * pxAt(c.sym) * lineWeight(c.sym, line), 0) + Object.entries(m.avail).reduce((t, [s, v]) => t + v * pxAt(s) * lineWeight(s, line), 0) +
    phUsd * lineWeight("phUSD", line);
  let spotUsd = 0, spotPnlV = 0, spotLiq = 0, spotBor = 0;
  d.spot.forEach((s) => {
    const v = s.qty * pxAt(s.sym);
    spotPnlV += sgn(s.side) * s.qty * (pxAt(s.sym) - s.entry);
    const u = s.side === "long" ? v : s.qty * s.entry;
    spotUsd += u;
    spotLiq += u * lineWeight(s.sym, "liq");
    spotBor += u * lineWeight(s.sym, "borrow");
  });
  let perpEq = d.phoenixIdle, perpNotional = 0, perpPnlV = 0;
  d.perps.forEach((p) => {
    const pl = sgn(p.side) * perpQty(p) * (pxPerp(p.k) - p.entry);
    perpPnlV += pl;
    perpEq += p.coll + pl;
    perpNotional += perpQty(p) * pxPerp(p.k);
  });
  const farmUsd = d.farm.reduce((t, f) => t + (f.amt + f.earned) * pxAt(f.sym), 0);
  const assets = collUsd + availUsd + spotUsd + perpEq + farmUsd;
  const debtUsd = m.debt.reduce((t, x) => t + x.amt * pxAt(x.sym), 0);
  const equity = assets - debtUsd;
  // The program's health (risk_engine, since the 2026-11 audit): sum of collateral x line weight / debt. Liquidation line = the
  // shown health factor (liquidatable at <= 1.10); the borrow line (LTV weights) is what borrow / withdraw / trades must keep above 1.10.
  // The Phoenix balance counts at 100% on both lines.
  const weighted = wTok("liq") + spotLiq + perpEq + farmUsd * FARM_W.liq;
  const weightedBorrow = wTok("borrow") + spotBor + perpEq + farmUsd * FARM_W.borrow;
  const maint = 0;
  const hf = debtUsd > 1e-9 ? weighted / debtUsd : Infinity;
  const borrowHf = debtUsd > 1e-9 ? weightedBorrow / debtUsd : Infinity;
  // Gross position value / equity: every token held, plus the larger of the Phoenix balance and its open notional.
  const exposure = assets - perpEq + Math.max(perpEq, perpNotional);
  const lev = equity > 0 ? exposure / equity : Infinity;
  // A real signed-in account: debt and the collateral total come from the chain reader (same prices as PX); health, equity and
  // leverage are the model's own, which also counts Phoenix and Farm like the website does.
  const L = LIVE_ACCT[chain];
  let debtOut = debtUsd, collOut = collUsd;
  if (L && base) {
    debtOut = L.debtUsd;
    collOut = L.collUsd + availUsd + perpEq + farmUsd;
  }
  const hfOut = hf, eqOut = equity, levOut = lev;
  const borrowApy = debtUsd ? m.debt.reduce((t, x) => t + x.amt * pxAt(x.sym) * (poolOf(chain, x.sym)?.borA ?? 0), 0) / debtUsd : 0;
  SCALE = 1;
  return {
    collUsd: collOut, weighted, weightedBorrow, borrowHf, maint, availUsd, spotUsd, perpEq, farmUsd, assets, debtUsd: debtOut, equity: eqOut, hf: hfOut, lev: levOut, exposure, borrowApy,
    interestDay: (debtUsd * borrowApy) / 100 / 365,
    openPnl: spotPnlV + perpPnlV,
  };
}

export type Account = ReturnType<typeof acct>;

/**
 * The margin account's Net P&L: what it is worth now (everything it holds, incl. Perps and Farm, less its loans, at live prices)
 * minus the net deposits (each deposit and withdrawal at its own time's price). Trading profit, farm earnings and interest paid
 * are all inside that figure. `known` is false when some deposit has no recorded price (shown as "—").
 */
export function marginPnl(chain: Chain): { known: boolean; value: number; pts: number[] } {
  const d = DATA[chain];
  const nd = d.margin.netDeposits;
  if (!hasMargin(d) || nd == null) return { known: false, value: 0, pts: [] };
  const a = acct(chain);
  const debt = d.margin.debt.reduce((t, x) => t + x.amt * px(x.sym), 0);
  const value = a.assets - debt - nd;
  const snaps = d.margin.pnlSnaps ?? [];
  return { known: true, value, pts: snaps.length ? [...snaps.map((s) => s[1]), Math.round(value * 100) / 100] : [] };
}
setPnlProbe((chain) => {
  const p = marginPnl(chain);
  return p.known ? p.value : null;
});

export function lendTotals(chain: Chain) {
  const lend = DATA[chain].lend;
  const sup = lend.reduce((t, l) => t + l.amt * px(l.sym), 0);
  const earned = lend.reduce((t, l) => t + l.earned * px(l.sym), 0);
  const apy = sup ? lend.reduce((t, l) => t + l.amt * px(l.sym) * (poolOf(chain, l.sym)?.supA ?? 0), 0) / sup : 0;
  // false when any position's earnings could not be proven from the chain's history (screens show "—", never 0)
  const earnedKnown = !lend.some((l) => l.earnedUnknown);
  return { sup, earned, apy, earnedKnown };
}

export const walletUsd = (chain: Chain) => Object.entries(DATA[chain].wallet).reduce((t, [s, v]) => t + v * px(s), 0);

// net = wallet + lending + margin equity, so the three hero balances always add up.
export function portfolioTotals(chain: Chain) {
  const d = DATA[chain];
  const a = acct(chain), l = lendTotals(chain), wallet = walletUsd(chain);
  const farmEarned = d.farm.reduce((t, f) => t + f.earned * (PX[f.sym] ?? 1), 0);
  const margin = hasMargin(d) ? a.equity : 0;
  const lending = l.sup + l.earned;
  const earnLend = l.earned;
  const earnTrade = (hasMargin(d) ? a.openPnl : 0) + d.realized + farmEarned;
  // which of these figures the chain's history can back (a real account); unknown ones show "—"
  const earnLendKnown = l.earnedKnown;
  const earnTradeKnown = !d.realizedUnknown && !d.farm.some((f) => f.earnedUnknown);
  const interestKnown = !d.margin.interestUnknown;
  return {
    net: wallet + lending + margin, wallet, lending, margin, earnLend, earnTrade,
    netEarn: earnLend + earnTrade, interestPaid: d.margin.interestPaid, a, l,
    earnLendKnown, earnTradeKnown, interestKnown, netEarnKnown: earnLendKnown && earnTradeKnown,
  };
}

export type HfZone = "pos" | "warn" | "neg";
export const hfZone = (h: number): HfZone => (h >= SAFE_FROM ? "pos" : h > LIQ_HF ? "warn" : "neg");
export const hfWord = (h: number) => (h >= SAFE_FROM ? "Safe" : h > LIQ_HF ? "Watch" : "Liquidation");

// Every open position (Spot, Perps, Farm) in one shape for Portfolio's Overview and Trader views.
export type Position = {
  sub: "spot" | "perps" | "farm";
  id: string;
  sym: string;
  name: string;
  pnl: number;
  pct: number;
  size: number;
  // false: a farm position whose earnings the chain's history cannot prove ("—")
  pnlKnown?: boolean;
  /** The venue's logo, shown next to the tags (Perps: Phoenix). */
  venue?: string;
  tags: { label: string; tone: "long" | "short" | "grey" | "teal" }[];
};

export function spotPositions(chain: Chain): Position[] {
  return DATA[chain].spot.map((s) => {
    const pnl = spotPnl(s), basis = s.qty * s.entry;
    return {
      sub: "spot", id: s.id, sym: s.sym, name: s.sym, pnl, pct: basis ? (pnl / basis) * 100 : 0, size: spotValue(s),
      tags: [{ label: s.side === "long" ? "Long" : "Short", tone: s.side }, { label: "Spot", tone: "grey" }],
    };
  });
}

// Leverage of a Perps position as the website shows it: all open positions' current size over the shared Phoenix collateral (1.45x).
export function perpLev(chain: Chain, p: PerpPos): number {
  const all = DATA[chain].perps;
  const exposure = all.reduce((t, x) => t + perpQty(x) * perpMark(x.k), 0);
  const coll = all.reduce((t, x) => t + x.coll, 0);
  return exposure > 0 && coll > 0 ? exposure / coll : p.lev;
}
/** `1.45x`: two decimals below 2x, one from 2x (0.98x must not read as 1x). */
export const levText = (l: number) => `${l < 2 ? Number(l.toFixed(2)) : Number(l.toFixed(1))}x`;

export function perpPositions(chain: Chain): Position[] {
  if (chain !== "solana") return [];
  return DATA[chain].perps.map((p) => {
    const pnl = perpPnl(p);
    return {
      sub: "perps", id: p.id, sym: p.k, name: `${p.k}-PERP`, pnl, pct: p.coll ? (pnl / p.coll) * 100 : 0, size: perpQty(p) * perpMark(p.k),
      venue: "PHOENIX",
      tags: [{ label: `${p.side === "long" ? "Long" : "Short"} ${levText(perpLev(chain, p))}`, tone: p.side }],
    };
  });
}

export function farmPositions(chain: Chain): Position[] {
  return DATA[chain].farm.map((f) => {
    const pnl = f.earned * px(f.sym), base = f.amt * px(f.sym);
    return {
      pnlKnown: !f.earnedUnknown,
      sub: "farm", id: f.id, sym: f.icon, name: f.name, pnl, pct: base ? (pnl / base) * 100 : 0, size: (f.amt + f.earned) * px(f.sym),
      tags: [{ label: f.venue || "Farm", tone: "teal" }],
    };
  });
}

// A swap is not a position (design S8): Overview's Positions card lists Perps and Farm.
export const openPositions = (chain: Chain) => [...perpPositions(chain), ...farmPositions(chain)];

export function lendRows(chain: Chain) {
  return DATA[chain].lend.map((l) => {
    const p = poolOf(chain, l.sym);
    return { sym: l.sym, amt: l.amt, held: l.amt + l.earned, apy: p?.supA ?? 0, value: (l.amt + l.earned) * px(l.sym), earned: l.earned * px(l.sym), earnedKnown: !l.earnedUnknown, since: l.since };
  });
}

export const priceOf = px;

// Room before liquidation, account-wide (design liqRoom / dropToLiq): the move of ALL non-stable prices together that takes the
// health factor to 1.10. Negative = prices falling. null = no debt or no move liquidates it.
export function priceRoom(chain: Chain): { state: "nodebt" | "now" | "none" | "ok"; pct?: number } {
  const h0 = acct(chain).hf;
  if (!isFinite(h0)) return { state: "nodebt" };
  if (h0 <= LIQ_HF) return { state: "now" };
  const hfAt = (x: number) => acct(chain, x).hf;
  const cross = (path: number[]) => {
    let prev = 1;
    for (const x of path) {
      if (hfAt(x) <= LIQ_HF) {
        let lo = prev, hi = x;
        for (let j = 0; j < 40; j++) {
          const m = (lo + hi) / 2;
          if (hfAt(m) <= LIQ_HF) hi = m;
          else lo = m;
        }
        return (lo + hi) / 2;
      }
      prev = x;
    }
    return null;
  };
  const dn = cross(Array.from({ length: 100 }, (_, i) => 1 - ((i + 1) / 100) * 0.999));
  const up = cross(Array.from({ length: 62 }, (_, i) => Math.pow(1.05, i + 1)));
  if (dn == null && up == null) return { state: "none" };
  if (up == null || (dn != null && 1 - dn <= up - 1)) return { state: "ok", pct: -(1 - (dn as number)) * 100 };
  return { state: "ok", pct: (up - 1) * 100 };
}

// Value the account can lose before the health factor reaches 1.10.
export function lossBuffer(chain: Chain) {
  const a = acct(chain);
  return Math.max(0, a.weighted - LIQ_HF * (a.debtUsd + a.maint));
}

export const SAFE_HF = 1.15, WARN_HF = 1.25, LEV_CAP = 10;

// Run `fn` against a copy of the chain's data and return the account it would give (design margin.js sim): before → after previews.
export function simAcct(chain: Chain, fn: (d: ChainData) => void) {
  const real = DATA[chain];
  const copy: ChainData = JSON.parse(JSON.stringify(real));
  DATA[chain] = copy;
  SIMMING++;
  try {
    fn(copy);
    return acct(chain);
  } finally {
    SIMMING--;
    DATA[chain] = real;
  }
}

// Largest x in [0, hi] for which ok(x) holds (ok is monotone), 40 halvings.
export function bisect(ok: (x: number) => boolean, hi: number) {
  if (!(hi > 0) || !ok(0)) return 0;
  if (ok(hi)) return hi;
  let lo = 0;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (ok(m)) lo = m;
    else hi = m;
  }
  return lo;
}

// Margin account edits (design mAddColl / mAddIdle / mAddDebt / mPayDebt / mTake).
export const mAddColl = (d: ChainData, s: string, v: number) => {
  const c = d.margin.coll.find((x) => x.sym === s);
  if (c) c.amt += v;
  else d.margin.coll.push({ sym: s, amt: v });
};
export const mAddIdle = (d: ChainData, s: string, v: number) => {
  d.margin.avail[s] = Math.max(0, (d.margin.avail[s] ?? 0) + v);
};
export const mAddDebt = (d: ChainData, s: string, v: number) => {
  const x = d.margin.debt.find((y) => y.sym === s);
  if (x) x.amt += v;
  else d.margin.debt.push({ sym: s, amt: v });
};
export const mPayDebt = (d: ChainData, s: string, v: number) => {
  const x = d.margin.debt.find((y) => y.sym === s);
  if (!x) return;
  x.amt -= v;
  if (x.amt <= 1e-9) d.margin.debt = d.margin.debt.filter((y) => y !== x);
};
// out of the account: idle funds first, then deposited collateral
export const mTake = (d: ChainData, s: string, v: number) => {
  const idle = d.margin.avail[s] ?? 0, fromIdle = Math.min(idle, v);
  d.margin.avail[s] = idle - fromIdle;
  let rest = v - fromIdle;
  const c = d.margin.coll.find((x) => x.sym === s);
  if (c && rest > 0) {
    const t = Math.min(c.amt, rest);
    c.amt -= t;
    rest -= t;
    if (c.amt <= 1e-9) d.margin.coll = d.margin.coll.filter((x) => x !== c);
  }
};
// what the account holds of a token (collateral + idle)
export const mbal = (d: ChainData, s: string) => (d.margin.coll.find((x) => x.sym === s)?.amt ?? 0) + (d.margin.avail[s] ?? 0);

// The price of  at which the whole account reaches health factor 1.10, everything else unchanged (design liqPrice).
export function liqPriceOf(chain: Chain, sym: string, side: Side) {
  const base = px(sym);
  const hfAt = (p: number) => {
    OVR = { [sym]: p };
    try {
      return acct(chain).hf;
    } finally {
      OVR = {};
    }
  };
  if (!isFinite(hfAt(base))) return null;
  const path = side === "long" ? Array.from({ length: 100 }, (_, i) => base * (1 - ((i + 1) / 100) * 0.999)) : Array.from({ length: 80 }, (_, i) => base * Math.pow(1.05, i + 1));
  let prev = base;
  for (const p of path) {
    if (hfAt(p) <= LIQ_HF) {
      let lo = prev, hi = p;
      for (let j = 0; j < 40; j++) {
        const m = (lo + hi) / 2;
        if (hfAt(m) <= LIQ_HF) hi = m;
        else lo = m;
      }
      return (lo + hi) / 2;
    }
    prev = p;
  }
  return null;
}
