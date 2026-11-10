import { perpMark } from "@/chain/perp-mark";
import { hfFmt, levFmt, nf, pct, sUsd, tokFmt, usd } from "@/format";
import { CHG_OF } from "./chg";
import { type ChainData, DATA, PX } from "@/sample/data";
import { acct, hasMargin, LIQ_HF, liqPriceOf, mAddDebt, mPayDebt, perpPnl, perpQty, poolOf, portfolioTotals, priceRoom, SAFE_HF, simAcct } from "@/sample/model";
import { OVERVIEW, MY_RANK, USERS } from "@/sample/rewards";
import { type Chain, CHAIN_LABEL } from "@/state/chain";
import {
  stellarBorrow,
  stellarDepositCollateral,
  stellarRepay,
  stellarSpotSwap,
} from "@/chain/stellar/actions";
import { submitEarn } from "@/chain/stellar/submit";
import {
  solanaDepositAndBorrow,
  solanaEarnSupply,
  solanaMarginSwap,
  solanaPerpsClose,
  solanaRepay,
  solanaWalletSwap,
} from "@/chain/solana/actions";

/* Copilot answers and plans (design screens/copilot.js V7): intents → checked plans. Every plan is simulated on a copy of the account
   (steps with amounts and venues, health factor and leverage before → after). Guardrails on every card: a health floor of 1.15 (a plan
   that ends below it is never offered), valid for 5 minutes, and a live re-check at current prices when you approve. */
export const FLOOR = SAFE_HF, TTL = 5 * 60e3;
export type Venue = "vanna" | "jup" | "phx" | "soro" | "wallet" | "earn";
export const VEN: Record<Venue, [string, string | null]> = { vanna: ["Vanna", null], jup: ["Jupiter", "JUP"], phx: ["Phoenix", "PHX"], soro: ["Soroswap", "SOROSWAP"], wallet: ["Wallet", null], earn: ["Earn", null] };
type Snap = { hf: number; lev: number };
export type Plan = {
  id: string;
  title: string;
  sub?: string;
  steps: { t: string; ven: Venue }[];
  s0: Snap;
  s1: Snap;
  extra?: [string, string, string?];
  mutate: (d: ChainData) => void;
  send?: () => Promise<string | void>;
  tx: { title: string; cta: string; legs: { l: string; v: string; s?: string }[]; rows: [string, string][] };
  result: string;
  state: "ready" | "done" | "dismissed" | "expired" | "blocked";
  exp: number;
  why?: string;
};
export type Answer =
  | { kind: "text"; text: string; chips?: string[] }
  | { kind: "facts"; head: string; rows: [string, string, string?][]; note?: string; chips?: string[] }
  | { kind: "plan"; plan: Plan; chips?: string[] }
  | { kind: "done"; text: string; rows: [string, string][] };

let seq = 0;
const text = (t: string, chips?: string[]): Answer => ({ kind: "text", text: t, chips });
const facts = (head: string, rows: [string, string, string?][], o: { note?: string; chips?: string[] } = {}): Answer => ({ kind: "facts", head, rows, ...o });
const r2 = (n: number) => Math.floor(n * 100) / 100;
const isStable = (s: string) => /USD/.test(s);
const sol = (c: Chain) => c === "solana";
const base = (c: Chain) => (sol(c) ? "SOL" : "XLM");
const now0 = (c: Chain): Snap => {
  const a = acct(c);
  return { hf: a.hf, lev: a.lev };
};
const sim = (c: Chain, fn: (d: ChainData) => void): Snap => {
  const a = simAcct(c, fn);
  return { hf: a.hf, lev: a.lev };
};
const hfLabel = (h: number) => (h >= 1.5 ? "Safe" : h > LIQ_HF ? "Watch" : "Liquidation");
const idleStable = (c: Chain) => Object.keys(DATA[c].margin.avail).find(isStable) ?? (sol(c) ? "USDC" : "SoUSDC");
const debtStable = (c: Chain) => DATA[c].margin.debt.find((x) => isStable(x.sym))?.sym ?? idleStable(c);
const swapVen = (c: Chain): Venue => (sol(c) ? "jup" : "soro");
const plan = (o: Omit<Plan, "id" | "state" | "exp">): Answer => ({ kind: "plan", plan: { ...o, id: `pl${++seq}`, state: "ready", exp: Date.now() + TTL } });
const blocked = (c: Chain, s1: Snap, what: string) =>
  text(`${what} would take your health factor to ${hfFmt(s1.hf)}, below the ${nf(FLOOR, 2)} floor. I won't plan that. Try a smaller size.`, ["Rebalance to HF 1.6", explainQ(c)]);

export const INTENTS = (c: Chain): [string, string][] =>
  sol(c)
    ? [["trending_up", "Long SOL 3x"], ["shield", "Protect my SOL"], ["savings", "Earn on idle USDC"], ["close", "Close my losing perps"], ["balance", "Rebalance to HF 1.6"]]
    : [["trending_up", "Long XLM 3x"], ["shield", "Protect my XLM"], ["savings", "Earn on idle USDC"], ["balance", "Rebalance to HF 1.6"]];
export const explainQ = (c: Chain) => {
  const h = acct(c).hf;
  return isFinite(h) && h < 100 ? `Why is my health factor ${hfFmt(h)}?` : "What's my health factor?";
};

function planLong(c: Chain, sym: string | undefined, lev: number): Answer {
  const d = DATA[c];
  if (!hasMargin(d)) return text("Open a margin account first. Then I can size a leveraged long.", ["Earn on idle USDC"]);
  const S = sym && PX[sym] != null ? sym : base(c), L = Math.max(1.5, Math.min(5, lev || 3));
  const s = idleStable(c), own = r2(d.margin.avail[s] ?? 0);
  if (own < 10) return text(`No idle ${s} in your margin account. Move some in first.`, ["Earn on idle USDC"]);
  let borrow = r2(own * (L - 1)), sized = false;
  const mut = (b: number) => (x: ChainData) => {
    x.margin.avail[s] = (x.margin.avail[s] ?? 0) - own;
    mAddDebt(x, s, b);
    x.spot.push({ id: `cp-${seq}`, sym: S, side: "long", qty: (own + b) / PX[S], entry: PX[S], t: "Oct 7, now" });
  };
  let s1 = sim(c, mut(borrow));
  while (s1.hf < 1.2 && borrow > 20) {
    borrow = r2(borrow * 0.8);
    s1 = sim(c, mut(borrow));
    sized = true;
  }
  if (s1.hf < FLOOR) return blocked(c, s1, `A ${S} long at ${nf(L, 1)}x`);
  const cost = own + borrow, qty = cost / PX[S], Lx = `${+(cost / own).toFixed(1)}x`;
  return plan({
    title: `Long ${S} ${Lx}`, sub: sized ? "Sized down to keep health above 1.20" : undefined,
    steps: [{ t: `Borrow ${tokFmt(borrow, s)}`, ven: "vanna" }, { t: `Swap ${tokFmt(cost, s)} for ${tokFmt(qty, S)}`, ven: swapVen(c) }, { t: `Hold ${tokFmt(qty, S)} in margin`, ven: "vanna" }],
    s0: now0(c), s1, mutate: mut(borrow),
    send: async () => {
      if (c === "stellar") {
        if (borrow > 0) await stellarBorrow(s, borrow);
        return await stellarSpotSwap({
          fromSym: s,
          toSym: S,
          amountIn: cost,
          minAmountOut: qty * 0.99,
          slippagePct: 1,
          venue: "Soroswap",
          fromMargin: true,
        } as any);
      }
      if (borrow > 0) {
        await solanaDepositAndBorrow({ borrows: [{ sym: s, amount: borrow }] });
      }
      return await solanaMarginSwap({
        fromSym: s,
        toSym: S,
        amount: cost,
        slippageBps: 100,
      });
    },
    tx: { title: `Review long ${S}`, cta: `Confirm long ${S}`, legs: [{ l: "You commit", v: tokFmt(own, s), s: "Idle in your margin account" }, { l: "Your long", v: tokFmt(qty, S), s: `${Lx} at ${usd(PX[S])}` }], rows: [["Borrowed", tokFmt(borrow, s)], ["Route", VEN[swapVen(c)][0]]] },
    result: `Your ${S} long is open: ${tokFmt(qty, S)} at ${usd(PX[S])}.`,
  });
}

function planProtect(c: Chain, sym?: string): Answer {
  const d = DATA[c];
  if (!hasMargin(d)) return text("You have no margin account, so nothing can be liquidated.");
  const S = sym && PX[sym] != null ? sym : base(c);
  const ds = debtStable(c), w = (d.wallet[ds] ?? 0) > 50 ? ds : "USDC", swap = w !== ds, have = d.wallet[w] ?? 0, debt = d.margin.debt.find((x) => x.sym === ds)?.amt ?? 0;
  const x = r2(Math.min(have - (w === "USDC" && sol(c) ? 50 : 0), debt, sol(c) ? 500 : 400));
  if (!(x > 5)) return text(`There is no idle ${w} in your wallet to repay with. Move some in, or close a position.`, ["Close my losing perps"]);
  const mut = (y: ChainData) => {
    y.wallet[w] = (y.wallet[w] ?? 0) - x;
    mPayDebt(y, ds, x);
  };
  const lp0 = liqPriceOf(c, S, "long");
  const real = DATA[c], copy: ChainData = JSON.parse(JSON.stringify(real));
  mut(copy);
  DATA[c] = copy;
  let lp1: number | null;
  try {
    lp1 = liqPriceOf(c, S, "long");
  } finally {
    DATA[c] = real;
  }
  return plan({
    title: `Protect your ${S}`,
    steps: [swap ? { t: `Swap ${tokFmt(x, w)} for ${ds}`, ven: "soro" } : { t: `Send ${tokFmt(x, w)} from your wallet`, ven: "wallet" }, { t: `Repay ${tokFmt(x, ds)} of the loan`, ven: "vanna" }],
    s0: now0(c), s1: sim(c, mut), mutate: mut,
    extra: lp0 != null && lp1 != null ? [`${S} liq. price`, `${usd(lp0)} → ${usd(lp1)}`] : undefined,
    send: async () => {
      if (c === "stellar") {
        if (swap) {
          await stellarSpotSwap({ fromSym: w, toSym: ds, amountIn: x, minAmountOut: x * 0.99, slippagePct: 1, venue: "Soroswap", fromMargin: false } as any);
        }
        await stellarDepositCollateral(ds, x);
        return await stellarRepay(ds, x);
      }
      if (swap) {
        await solanaWalletSwap({ fromSym: w, toSym: ds, amount: x });
      }
      return await solanaRepay({ sym: ds, amount: x, source: "wallet" });
    },
    tx: { title: "Review repay", cta: "Confirm repay", legs: [{ l: "You repay", v: tokFmt(x, ds), s: swap ? `From ${tokFmt(x, w)} in your wallet` : "From your wallet" }], rows: [["Debt left", usd(Math.max(0, debt - x))]] },
    result: `Repaid ${tokFmt(x, ds)}. Your ${S} sits further from liquidation.`,
  });
}

function planIdle(c: Chain): Answer {
  const d = DATA[c];
  const a = poolOf(c, "USDC") ? "USDC" : (Object.keys(d.wallet).find((s) => isStable(s) && poolOf(c, s)) ?? "");
  const pool = a ? poolOf(c, a) : undefined;
  if (!pool) return text("There is no stable vault on this network yet.");
  const x = r2(Math.max(0, (d.wallet[a] ?? 0) - (a === "USDC" && sol(c) ? 50 : 0)));
  if (!(x > 5)) return text(`You have no idle ${a} in your wallet.`, ["Rebalance to HF 1.6"]);
  const mut = (y: ChainData) => {
    y.wallet[a] -= x;
    const l = y.lend.find((v) => v.sym === a);
    if (l) l.amt += x;
    else y.lend.push({ sym: a, amt: x, earned: 0, since: "Oct 7" });
  };
  return plan({
    title: `Earn ${pct(pool.supA)} on ${tokFmt(x, a)}`,
    steps: [{ t: `Supply ${tokFmt(x, a)} from your wallet`, ven: "earn" }, { t: `Earn ${pct(pool.supA)} APY, about ${usd((x * pool.supA) / 100 / 12)} a month`, ven: "earn" }],
    s0: now0(c), s1: sim(c, mut), mutate: mut, extra: ["Margin account", "Not touched"],
    send: async () => {
      if (c === "stellar") {
        return await submitEarn("supply", a, x);
      }
      return await solanaEarnSupply(a, x);
    },
    tx: { title: "Review supply", cta: "Confirm supply", legs: [{ l: "You supply", v: tokFmt(x, a), s: "From your wallet" }, { l: "You earn", v: `${pct(pool.supA)} APY`, s: "Withdraw any time" }], rows: [["Vault", `${a} vault`]] },
    result: `${tokFmt(x, a)} is earning ${pct(pool.supA)} APY.`,
  });
}

function planLosers(c: Chain): Answer {
  if (!sol(c)) return text(`There are no perps on ${CHAIN_LABEL[c]}.`);
  const d = DATA[c], L = d.perps.filter((p) => perpPnl(p) < 0);
  if (!L.length) return facts("None of your perps are losing right now.", d.perps.map((p) => [`${p.k}-PERP ${p.side} ${p.lev}x`, sUsd(perpPnl(p)), perpPnl(p) < 0 ? "neg" : "pos"]), { chips: ["Protect my SOL"] });
  const fee = (p: (typeof L)[number]) => perpQty(p) * perpMark(p.k) * 0.0005;
  const back = L.reduce((t, p) => t + p.coll + perpPnl(p) - fee(p), 0), pnl = L.reduce((t, p) => t + perpPnl(p) - fee(p), 0), ids = L.map((p) => p.id);
  const mut = (y: ChainData) => {
    y.perps = y.perps.filter((p) => !ids.includes(p.id));
    y.margin.avail.USDC = (y.margin.avail.USDC ?? 0) + back;
    y.realized += pnl;
  };
  return plan({
    title: `Close ${L.length} losing perp${L.length === 1 ? "" : "s"}`,
    steps: [...L.map((p) => ({ t: `Close ${p.k}-PERP ${p.side} ${p.lev}x, ${sUsd(perpPnl(p))}`, ven: "phx" as Venue })), { t: `Return ${tokFmt(back, "USDC")} to margin`, ven: "vanna" }],
    s0: now0(c), s1: sim(c, mut), mutate: mut, extra: ["Realized P&L", sUsd(pnl), pnl < 0 ? "neg" : "pos"],
    send: async () => {
      let last = "";
      for (const p of L) {
        last = await solanaPerpsClose({ market: p.k, side: p.side });
      }
      return last;
    },
    tx: { title: "Review close", cta: "Confirm close", legs: [{ l: "You close", v: L.map((p) => `${p.k}-PERP`).join(", "), s: "On Phoenix" }, { l: "Back to margin", v: tokFmt(back, "USDC"), s: `${sUsd(pnl)} P&L` }], rows: [["Fees", usd(L.reduce((t, p) => t + fee(p), 0))]] },
    result: `Closed ${L.map((p) => p.k + "-PERP").join(", ")}. ${usd(back)} is back in your margin account.`,
  });
}

function planRebalance(c: Chain, target: number): Answer {
  const d = DATA[c], h0 = acct(c).hf;
  if (!hasMargin(d) || !isFinite(h0)) return text("You have no debt, so there is nothing to rebalance.");
  const t = Math.max(1.2, Math.min(3, target || 1.6));
  if (h0 >= t) return text(`Your health factor is already ${hfFmt(h0)}, above ${nf(t, 2)}.`, [INTENTS(c)[0][1]]);
  const ds = debtStable(c), m = idleStable(c) === ds ? (d.margin.avail[ds] ?? 0) : 0, wsym = (d.wallet[ds] ?? 0) > 50 ? ds : "USDC";
  const wal = Math.max(0, (d.wallet[wsym] ?? 0) - (wsym === "USDC" && sol(c) ? 50 : 0)), debt = d.margin.debt.find((x) => x.sym === ds)?.amt ?? 0, max = Math.min(debt, m + wal);
  const mut = (x: number) => (y: ChainData) => {
    const a = Math.min(x, m), b = x - a;
    if (a) y.margin.avail[ds] -= a;
    if (b) y.wallet[wsym] = (y.wallet[wsym] ?? 0) - b;
    mPayDebt(y, ds, x);
  };
  let x = max, sub: string | undefined;
  const sMax = sim(c, mut(max));
  if (sMax.hf < t) {
    if (max < 5) return text("There are no idle funds to repay with. Close a position to free some.", ["Close my losing perps"]);
    sub = `Reaches ${hfFmt(sMax.hf)}, the most your idle funds allow`;
  } else {
    let lo = 0, hi = max;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (sim(c, mut(mid)).hf >= t) hi = mid;
      else lo = mid;
    }
    x = Math.ceil(hi * 100) / 100;
  }
  const a = Math.min(x, m), b = r2(x - a), swap = wsym !== ds, s1 = sim(c, mut(x));
  const steps: Plan["steps"] = [];
  if (a > 0) steps.push({ t: `Use ${tokFmt(a, ds)} idle in margin`, ven: "vanna" });
  if (b > 0) steps.push(swap ? { t: `Swap ${tokFmt(b, wsym)} from your wallet for ${ds}`, ven: "soro" } : { t: `Send ${tokFmt(b, wsym)} from your wallet`, ven: "wallet" });
  steps.push({ t: `Repay ${tokFmt(x, ds)} of the loan`, ven: "vanna" });
  return plan({
    title: `Rebalance to HF ${hfFmt(s1.hf)}`, sub, steps, s0: now0(c), s1, mutate: mut(x),
    send: async () => {
      if (c === "stellar") {
        if (b > 0) {
          if (swap) {
            await stellarSpotSwap({ fromSym: wsym, toSym: ds, amountIn: b, minAmountOut: b * 0.99, slippagePct: 1, venue: "Soroswap", fromMargin: false } as any);
          }
          await stellarDepositCollateral(ds, b);
        }
        return await stellarRepay(ds, x);
      }
      if (b > 0) {
        if (swap) {
          await solanaWalletSwap({ fromSym: wsym, toSym: ds, amount: b });
        }
        if (a > 0) {
          await solanaRepay({ sym: ds, amount: a, source: "margin" });
        }
        return await solanaRepay({ sym: ds, amount: b, source: "wallet" });
      }
      return await solanaRepay({ sym: ds, amount: x, source: "margin" });
    },
    tx: { title: "Review rebalance", cta: "Confirm repay", legs: [{ l: "You repay", v: tokFmt(x, ds), s: [a > 0 ? `${tokFmt(a, ds)} from margin` : "", b > 0 ? `${tokFmt(b, wsym)} from wallet` : ""].filter(Boolean).join(", ") }], rows: [] },
    result: `Repaid ${tokFmt(x, ds)}.`,
  });
}

function ansHealth(c: Chain): Answer {
  if (!hasMargin(DATA[c])) return text("You have no margin account yet, so there is nothing to liquidate. Open one from Margin.");
  const a = acct(c), r = priceRoom(c);
  if (!isFinite(a.hf)) return facts("You have no debt, so nothing in your margin account can be liquidated.", [["Equity", usd(a.equity)], ["Debt", usd(0)]]);
  const room = r.state === "ok" ? `${nf(Math.abs(r.pct ?? 0), 1)}% price drop` : r.state === "now" ? "None" : "—";
  return facts(
    `${hfFmt(a.hf)} is ${hfLabel(a.hf)}: your weighted collateral covers your debt ${nf(a.hf, 2)} times. Liquidation is at 1.10.`,
    [["Health factor", `${hfFmt(a.hf)} ${hfLabel(a.hf)}`, a.hf >= 1.5 ? "pos" : "warn"], ["Room before liquidation", room, r.state === "ok" ? "neg" : ""], ["Debt", usd(a.debtUsd)], ["Equity", usd(a.equity)], ["Leverage", levFmt(a.lev)]],
    { note: r.state === "ok" ? "Room = how far all prices can fall together before 1.10." : undefined, chips: ["Rebalance to HF 1.6", `Protect my ${base(c)}`] },
  );
}
function ansPrice(c: Chain, sym?: string): Answer {
  if (!sym || PX[sym] == null) return text("I don't have a price for that. Try SOL, TSLAx, OPENAI or XLM.");
  const ch = CHG_OF[sym];
  return facts(`${sym} is ${usd(PX[sym], PX[sym] < 1 ? 4 : 2)}${ch != null ? `, ${ch >= 0 ? "+" : "−"}${nf(Math.abs(ch), 2)}% today` : ""}.`, [
    ["Price", usd(PX[sym], PX[sym] < 1 ? 4 : 2)], ["24h change", ch != null ? `${ch >= 0 ? "+" : "−"}${nf(Math.abs(ch), 2)}%` : "—", ch != null ? (ch >= 0 ? "pos" : "neg") : ""], ["Source", sol(c) ? "Pyth oracle" : "Reflector oracle"],
  ]);
}
function ansNet(c: Chain): Answer {
  const T = portfolioTotals(c);
  return facts(`Your net worth on ${CHAIN_LABEL[c]} is ${usd(T.net)}.`, [["Wallet", usd(T.wallet)], ["Lending", usd(T.lending)], ["Trading", usd(T.margin)], ["P&L", sUsd(T.netEarn), T.netEarn < 0 ? "neg" : "pos"]], {
    note: sol(c) ? "Lending is Earn and Predict. Trading is your margin account and positions." : "Lending is Earn. Trading is your margin account.", chips: ["Explain my health factor", "Which vault pays the most?"],
  });
}
function ansVaults(c: Chain): Answer {
  const ps = [...(sol(c) ? ["SOL", "USDC"] : ["XLM", "BLUSDC", "AqUSDC", "SoUSDC"])].map((s) => poolOf(c, s)).filter((p): p is NonNullable<typeof p> => !!p).sort((a, b) => b.supA - a.supA);
  const top = ps[0];
  if (!top) return text("There are no vaults on this network yet.");
  return facts(`The ${top.sym} vault pays the most on ${CHAIN_LABEL[c]}: ${pct(top.supA)} APY.`, ps.map((p) => [`${p.sym} vault`, `${pct(p.supA)} APY`, p === top ? "pos" : ""]), { note: "Rates move with how much is borrowed.", chips: ["Earn on idle USDC"] });
}
const ansPoints = (): Answer =>
  facts(`You have ${nf(OVERVIEW.points)} points, rank #${nf(MY_RANK)} of ${nf(USERS)}.`, [["Last weekly drop", "+" + nf(OVERVIEW.lastDrop)], ["This week", `${OVERVIEW.week.mods} modules, ${OVERVIEW.week.days} active days`], ["Referral tier", "Silver"]], {
    note: "The formula is not published. Points are credited every Monday.", chips: ["How do I unlock MCP?", "What's my net worth made of?"],
  });

const symOf = (w?: string) => {
  if (!w) return undefined;
  const k = Object.keys(PX).find((s) => s.toLowerCase() === w.toLowerCase());
  return k ?? w.toUpperCase();
};

export function reply(c: Chain, q: string): Answer {
  const s = q.toLowerCase();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/\blong\s+([a-z]+)\s*([\d.]+)\s*x/))) return planLong(c, symOf(m[1]), parseFloat(m[2]));
  if ((m = s.match(/\bprotect(?:\s+my)?\s*([a-z]+)?/))) return planProtect(c, symOf(m[1]));
  if (/idle\s+usdc|earn on idle|idle cash/.test(s)) return planIdle(c);
  if (/losing perps|close.*losing|losers/.test(s)) return planLosers(c);
  if ((m = s.match(/rebalance(?:\s+to)?(?:\s+hf)?\s*([\d.]+)?/))) return planRebalance(c, m[1] ? parseFloat(m[1]) : 1.6);
  if (/what happens|explain liquidation/.test(s) && /liquidat/.test(s))
    return text("If your health factor falls to 1.10, your margin account can be liquidated: some collateral is sold to pay back debt. Repaying debt or adding collateral raises it.", ["Rebalance to HF 1.6", "Explain my health factor"]);
  if (/health|liquidat|\bhf\b/.test(s)) return ansHealth(c);
  if ((m = s.match(/price of ([a-z]+)|([a-z]+) price/))) return ansPrice(c, symOf(m[1] || m[2]));
  if (/net worth|made of|my portfolio/.test(s)) return ansNet(c);
  if (/vault|pays the most|apy/.test(s)) return ansVaults(c);
  if (/point|reward|rank/.test(s)) return ansPoints();
  if (/\bmcp\b|agent|claude code|cursor/.test(s)) return text("MCP opens 7 days after Copilot unlocks. Your agent will read positions and draft plans, and every write still asks your wallet to sign.");
  return text("I can explain your positions and health, look up prices, and plan changes like supplying, repaying or closing positions. Try one of these.", [`Price of ${base(c)}`, "What's my health factor?", "Earn on idle USDC"]);
}

// Live re-check at approve time: same guardrail as the plan.
export function recheck(c: Chain, p: Plan): Snap {
  return sim(c, p.mutate);
}
