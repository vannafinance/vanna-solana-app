// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\flash-repay.ts
//
// Flash repay: close every position, repay every loan, optionally send what is left to the wallet. The website runs each step as
// its own transaction and approval, re-reading the chain between steps. Here the whole run is built up front and signed in ONE
// wallet approval (a run longer than MAX_TX_PER_APPROVAL is split into the fewest approvals, asked for one after another before
// anything is sent), then sent stage by stage (sendSolanaStages): a stage's legs go together, the next stage starts when they landed.
//
// The one exception is Perps. Phoenix pays out only an exact amount up to the trader's collateral (fork 2026-11-19: collateral + 1
// is refused, u64::MAX and 0 are refused by Vanna's validator), and closing a position settles its P&L and fee into that collateral
// at a fill price nobody knows before the close lands. A withdraw signed before the closes would either leave USDC behind in Phoenix
// or fail. So with positions open the run has TWO approvals: (1) the closes, sent together; (2) built from the chain once the closes
// landed: the exact Phoenix withdraw and everything after it. Without positions it is one approval.
//
// Amounts signed before earlier legs land, and why they are safe:
// - Kamino exits redeem the cTokens held now (the whole position); the underlying they bring is at least the reserve's current rate
//   (it only grows), so later legs count that lower bound.
// - Swaps (only to cover a loan the margin account cannot pay in its own token) spend an exact amount the account holds or receives
//   from an earlier leg, and count only the route's guaranteed minimum out.
// - repay_all repays the exact accrued debt whatever amount it names (fork 2026-11-19), so it stays right after a slow approval; the
//   plan makes sure the vault then holds the debt + 0.2% (the app's repay buffer).
// - "Also withdraw to wallet" sends lower bounds: what is held now, plus the lower bounds of what earlier legs bring, minus the debt
//   + 0.05% (interest for hours at any rate the pools use). A few cents of interest buffer and swap upside stay in the account; the
//   done text reads the chain and says exactly what stayed.
// Every leg keeps the usual checks: wallet-safe lookup tables only, a durable nonce per leg, the simulation of the signed bytes right
// before it is sent (with the price refresh), the core's own health check.

import { Buffer } from "buffer";

import { requireActiveRealWallet, WalletCancelledError } from "@/chain/sign";
import { fetchSolanaAccount, type SolanaAccount } from "./account";
import {
  buildFlashFarmExit,
  buildFlashPerpsCloses,
  buildFlashPhoenixWithdraw,
  buildFlashRepay,
  buildFlashSwap,
  buildFlashWithdraw,
  EXEC_COMPUTE_UNITS,
  fromRaw,
  getToken,
  marginPda,
  marginVault,
  readFlashPhoenix,
  TOKENS,
  type FlashPart,
  type FlashPhoenixState,
  type FlashProjection,
} from "./actions";
import { fetchKaminoPositions, fetchVaultPositions } from "./positions";
import { rpc } from "./rpc";
import {
  BatchPartError,
  chunkIndexes,
  MAX_TX_PER_APPROVAL,
  retireForkNonces,
  sendSolanaStages,
  signaturesLanded,
  StoppedError,
  type BatchControl,
  type LegInfo,
  type LegPhase,
  type StagedPart,
} from "./submit";

/** Interest buffer for "send to wallet" lower bounds: debt x 0.05% (+1 unit). */
const SEND_DEBT_BUFFER_BPS = 5n;
/** The repay check: the vault must hold the debt + 0.2% (+1 unit), as solanaRepay asks. */
const REPAY_BUFFER_BPS = 20n;
/** Holdings worth less than this are not swap sources, not sent to the wallet, USD. */
const DUST_USD = 0.01;
/** Stablecoins are spent first to cover a loan in another token. */
const STABLES = new Set(["USDC", "USDT", "JupUSD"]);

// ---------------------------------------------------------------------------------------------
// The plan (read only)
// ---------------------------------------------------------------------------------------------

export type FlashLegKind = "close" | "phoenix" | "exit" | "swap" | "repay" | "send";

/** One transaction of the run, in plain words. `id` is stable across a retry (the same work keeps the same id). */
export type FlashLegPlan = {
  id: string;
  kind: FlashLegKind;
  label: string;
  /** Short name for summaries ("ETH-PERP", "USDC loan"). */
  noun: string;
  /** Legs of one stage are sent together; a later stage waits for the earlier ones to land. Numbered across the whole run. */
  stage: number;
  /** Which wallet approval signs it (0 = the first). */
  approval: number;
};

export type FlashPlan = {
  owner: string;
  /** Nothing to do: no loans, no positions, no Phoenix funds (and nothing to send with toWallet). */
  empty: boolean;
  /** Why the run cannot go ahead (a loan nothing can cover, a queued Phoenix withdrawal); the review shows it and offers no button. */
  blocked?: string;
  toWallet: boolean;
  slippageBps: number;
  perps: { key: string; side: "long" | "short"; sizeUsd: number; pnlUsd: number; feeUsd: number; equityUsd: number }[];
  /** USDC the Phoenix withdraw brings back (exact when no position is open; estimated at the mark otherwise), plus phUSD waiting. */
  phoenixUsdc: number;
  phoenixExact: boolean;
  farm: { sym: string; receiptsRaw: bigint; amount: number; usd: number }[];
  swaps: { from: string; to: string; inRaw: bigint; inAmount: number; minOut: number; outAmount: number; inUsd: number; outUsd: number }[];
  loans: { sym: string; amount: number; usd: number; debtRaw: bigint }[];
  /** What goes to the wallet (toWallet): lower bounds. */
  sends: { sym: string; amount: number; usd: number; raw: bigint }[];
  /** Holdings Flash repay does not move (Perena shares, tokens it cannot price), shown as a note. */
  untouched: { name: string; usd: number }[];
  debtUsd: number;
  costs: { phoenixUsd: number; swapUsd: number };
  /** What stays in the margin account afterwards (toWallet: the small buffer that stays), USD. */
  leftUsd: number;
  legs: FlashLegPlan[];
  txCount: number;
  approvals: number;
  /** The run needs a second approval after the Perps closes landed (see the top of this file). */
  perpsSecondApproval: boolean;
  healthFactor: number | null;
};

export type FlashPlanOptions = { toWallet?: boolean; slippageBps?: number; maxPerApproval?: number };

type Holdings = Map<string, bigint>;
const usdOf = (sym: string, raw: bigint, px: Record<string, number>) => (Number(raw) / 10 ** getToken(sym).decimals) * (px[sym] ?? 0);
const ui = (sym: string, raw: bigint) => Number(raw) / 10 ** getToken(sym).decimals;

/** The margin account's registry token balances, raw (the vaults' u64 amount). */
async function marginHoldings(owner: string): Promise<Holdings> {
  const margin = marginPda(owner);
  const vaults = TOKENS.map((t) => marginVault(margin, t.mint, t.tokenProgram));
  const res = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [vaults, { encoding: "base64", dataSlice: { offset: 64, length: 8 } }]);
  const out: Holdings = new Map();
  res.value.forEach((a, i) => {
    if (!a) return;
    const b = Buffer.from(a.data[0], "base64");
    if (b.length >= 8 && b.readBigUInt64LE(0) > 0n) out.set(TOKENS[i].symbol, b.readBigUInt64LE(0));
  });
  return out;
}

type Snapshot = { account: SolanaAccount; holdings: Holdings; phoenix: FlashPhoenixState | null };
async function snapshot(owner: string): Promise<Snapshot> {
  const [account, holdings, phoenix] = await Promise.all([fetchSolanaAccount(owner), marginHoldings(owner), readFlashPhoenix(owner).catch(() => null)]);
  return { account, holdings, phoenix };
}

/** Internal: the plan plus what the builders need (swap sources resolved, send amounts). */
type Computed = FlashPlan & { _snap: Snapshot };

/**
 * Reads the chain and works out the run: what is closed, exited, swapped, repaid and sent, in which stages, with how many approvals,
 * and the estimated costs. The same function decides what the run builds (the run calls it again on the fresh chain), so the
 * review's figures are the run's figures. Swaps are quoted (Jupiter) for their guaranteed minimum out.
 */
export async function planFlashRepay(owner: string, opts: FlashPlanOptions = {}): Promise<FlashPlan> {
  const c = await compute(owner, opts);
  const { _snap, ...plan } = c;
  void _snap;
  return plan;
}

async function compute(owner: string, opts: FlashPlanOptions): Promise<Computed> {
  const slippageBps = opts.slippageBps ?? 50;
  const toWallet = !!opts.toWallet;
  const max = opts.maxPerApproval ?? MAX_TX_PER_APPROVAL;
  const snap = await snapshot(owner);
  const { account, holdings, phoenix } = snap;
  const px = account.prices ?? {};
  const m = account.margin;
  const base: Computed = {
    owner, empty: true, toWallet, slippageBps, perps: [], phoenixUsdc: 0, phoenixExact: true, farm: [], swaps: [], loans: [], sends: [], untouched: [],
    debtUsd: 0, costs: { phoenixUsd: 0, swapUsd: 0 }, leftUsd: 0, legs: [], txCount: 0, approvals: 0, perpsSecondApproval: false, healthFactor: null, _snap: snap,
  };
  if (!m) return base;
  base.healthFactor = Number.isFinite(m.healthFactor) ? m.healthFactor : null;
  const marginAddr = marginPda(owner);
  const [kamino, vaults] = await Promise.all([fetchKaminoPositions(marginAddr), fetchVaultPositions(marginAddr)]);
  base.untouched = vaults.map((v) => ({ name: v.name, usd: v.amt }));

  // Perps: each position valued at the mark (P&L + funding - taker fee), as the website plans it.
  base.perps = (phoenix?.positions ?? []).map((p) => {
    const value = p.tokens * p.markUsd;
    const feeUsd = Math.abs(value) * p.takerFee;
    const pnl = value + p.quoteUsd + p.fundingUsd;
    return { key: p.key, side: p.side, sizeUsd: Math.abs(value), pnlUsd: pnl, feeUsd, equityUsd: pnl - feeUsd };
  });
  const perpsOpen = base.perps.length > 0;
  const phoenixRaw = phoenix ? phoenix.collateral + phoenix.phUsd : 0n;
  // Cross-margined: the collateral already holds the deposits; each close adds its P&L + funding - fee (negative for a loss).
  const settled = BigInt(Math.floor(base.perps.reduce((t, p) => t + p.equityUsd, 0) * 1e6));
  const phoenixEst = phoenixRaw + settled > 0n ? phoenixRaw + settled : 0n;
  base.phoenixUsdc = Number(perpsOpen ? phoenixEst : phoenixRaw) / 1e6;
  base.phoenixExact = !perpsOpen;
  base.costs.phoenixUsd = base.perps.reduce((t, p) => t + p.feeUsd, 0);
  if (phoenix?.queued) base.blocked = "Phoenix has a withdrawal queued for this account. Try Flash repay again once it has cleared.";

  // Holdings after the closes, the Phoenix withdraw and the Kamino exits (lower bounds).
  const hold: Holdings = new Map(holdings);
  const add = (sym: string, raw: bigint) => hold.set(sym, (hold.get(sym) ?? 0n) + raw);
  if (perpsOpen ? phoenixEst > 0n : phoenixRaw > 0n) add("USDC", perpsOpen ? phoenixEst : phoenixRaw);
  for (const k of kamino) {
    const t = getToken(k.sym);
    const lb = BigInt(Math.max(0, Math.floor(k.amt * 10 ** t.decimals) - 2));
    base.farm.push({ sym: k.sym, receiptsRaw: BigInt(k.receiptsRaw ?? "0"), amount: ui(k.sym, lb), usd: ui(k.sym, lb) * (px[k.sym] ?? 0) });
    add(k.sym, lb);
  }
  base.farm = base.farm.filter((f) => f.receiptsRaw > 0n);

  // Loans: each needs its debt + 0.2% in its own token; what is missing is swapped in from other holdings (stables first, then the
  // largest), sized from the route's guaranteed minimum out.
  base.loans = Object.entries(m.debt)
    .filter(([, d]) => d.amount > 0)
    .map(([sym, d]) => {
      const t = getToken(sym);
      return { sym, amount: d.amount, usd: d.usd, debtRaw: BigInt(Math.ceil(d.amount * 10 ** t.decimals)) };
    });
  base.debtUsd = base.loans.reduce((t, l) => t + l.usd, 0);
  const need = (raw: bigint) => raw + (raw * REPAY_BUFFER_BPS) / 10_000n + 1n;
  const reserved = (sym: string) => {
    const l = base.loans.find((x) => x.sym === sym);
    return l ? need(l.debtRaw) : 0n;
  };
  for (const loan of base.loans) {
    for (let round = 0; round < 4; round++) {
      const short = need(loan.debtRaw) - (hold.get(loan.sym) ?? 0n);
      if (short <= 0n) break;
      const src = [...hold.entries()]
        .filter(([sym]) => sym !== loan.sym && (px[sym] ?? 0) > 0)
        .map(([sym, raw]) => ({ sym, free: raw > reserved(sym) ? raw - reserved(sym) : 0n }))
        .map((x) => ({ ...x, usd: usdOf(x.sym, x.free, px) }))
        .filter((x) => x.usd > DUST_USD)
        .sort((a, b) => Number(STABLES.has(b.sym)) - Number(STABLES.has(a.sym)) || b.usd - a.usd)[0];
      if (!src) break;
      const from = getToken(src.sym);
      const shortUsd = usdOf(loan.sym, short, px);
      const sizeFor = (usd: number) => {
        const raw = BigInt(Math.floor((usd / (px[src.sym] ?? 1)) * 10 ** from.decimals));
        return raw > src.free ? src.free : raw;
      };
      let inRaw = sizeFor(Math.max(shortUsd * (1 + slippageBps / 10_000 + 0.003), 0.05));
      let q = await quoteJupiter(src.sym, loan.sym, inRaw, slippageBps);
      if (q.minOut < short && inRaw < src.free && q.minOut > 0n) {
        inRaw = sizeFor((usdOf(src.sym, inRaw, px) * Number(short)) / Number(q.minOut) * 1.003);
        q = await quoteJupiter(src.sym, loan.sym, inRaw, slippageBps);
      }
      if (q.minOut <= 0n) break;
      hold.set(src.sym, (hold.get(src.sym) ?? 0n) - inRaw);
      add(loan.sym, q.minOut);
      base.swaps.push({
        from: src.sym, to: loan.sym, inRaw, inAmount: ui(src.sym, inRaw), minOut: ui(loan.sym, q.minOut), outAmount: ui(loan.sym, q.out),
        inUsd: usdOf(src.sym, inRaw, px), outUsd: usdOf(loan.sym, q.out, px),
      });
    }
    const left = need(loan.debtRaw) - (hold.get(loan.sym) ?? 0n);
    if (left > 0n && !base.blocked) {
      base.blocked = `The account cannot cover its ${loan.sym} loan: ${fromRaw(left, getToken(loan.sym).decimals)} ${loan.sym} (~$${usdOf(loan.sym, left, px).toFixed(2)}) short after using every other holding. Deposit ${loan.sym} into the margin account, then try again.`;
    }
  }
  base.costs.swapUsd = base.swaps.reduce((t, s) => t + Math.max(0, s.inUsd - s.outUsd), 0);

  // After the repays (debt + 0.05% taken as the upper bound of what repay_all spends).
  for (const l of base.loans) hold.set(l.sym, (hold.get(l.sym) ?? 0n) - (l.debtRaw + (l.debtRaw * SEND_DEBT_BUFFER_BPS) / 10_000n + 1n));
  const remaining = [...hold.entries()].filter(([, raw]) => raw > 0n);
  const remainingUsd = remaining.reduce((t, [sym, raw]) => t + usdOf(sym, raw, px), 0);
  if (toWallet) {
    base.sends = remaining.filter(([sym, raw]) => usdOf(sym, raw, px) > DUST_USD).map(([sym, raw]) => ({ sym, raw, amount: ui(sym, raw), usd: usdOf(sym, raw, px) }));
    // What stays: the interest buffers and the swaps' upside over their minimum out, plus dust not worth a transaction.
    const buffers = base.loans.reduce((t, l) => t + usdOf(l.sym, (l.debtRaw * (SEND_DEBT_BUFFER_BPS + 0n)) / 10_000n, px), 0);
    const upside = base.swaps.reduce((t, s) => t + Math.max(0, s.outUsd - s.minOut * (px[s.to] ?? 0)), 0);
    base.leftUsd = buffers + upside + remaining.filter(([sym, raw]) => usdOf(sym, raw, px) <= DUST_USD).reduce((t, [sym, raw]) => t + usdOf(sym, raw, px), 0);
  } else base.leftUsd = remainingUsd;

  // Legs, stages, approvals.
  const legs: FlashLegPlan[] = [];
  let stage = 0;
  const push = (l: Omit<FlashLegPlan, "stage" | "approval">, st: number, appr: number) => legs.push({ ...l, stage: st, approval: appr });
  const group2 = perpsOpen ? 1 : 0;
  if (perpsOpen) {
    for (const p of base.perps) push({ id: `close:${p.key}`, kind: "close", label: `Close ${p.key}-PERP ${p.side} on Phoenix`, noun: `${p.key}-PERP` }, stage, 0);
    stage++;
  }
  if (perpsOpen || phoenixRaw > 0n) {
    push({ id: "phoenix", kind: "phoenix", label: `Withdraw ${base.phoenixExact ? "" : "about "}${base.phoenixUsdc.toFixed(2)} USDC from Phoenix`, noun: "Phoenix USDC" }, stage++, group2);
  }
  if (base.farm.length) {
    for (const f of base.farm) push({ id: `exit:${f.sym}`, kind: "exit", label: `Exit ${f.sym} on Kamino`, noun: `${f.sym} on Kamino` }, stage, group2);
    stage++;
  }
  if (base.swaps.length) {
    base.swaps.forEach((s, i) =>
      push({ id: `swap:${s.from}>${s.to}:${i}`, kind: "swap", label: STABLES.has(s.to) ? `Sell ${s.inAmount.toFixed(4)} ${s.from} on Jupiter` : `Buy back ${s.minOut.toFixed(4)} ${s.to} on Jupiter`, noun: `${s.from} to ${s.to}` }, stage, group2),
    );
    stage++;
  }
  if (base.loans.length) {
    for (const l of base.loans) push({ id: `repay:${l.sym}`, kind: "repay", label: `Repay ${l.amount.toFixed(getToken(l.sym).decimals > 6 ? 4 : 2)} ${l.sym}`, noun: `${l.sym} loan` }, stage, group2);
    stage++;
  }
  if (toWallet) for (const s of base.sends) push({ id: `send:${s.sym}`, kind: "send", label: `Send ${s.amount.toFixed(getToken(s.sym).decimals > 6 ? 4 : 2)} ${s.sym} to your wallet`, noun: s.sym }, stage, group2);
  base.legs = legs;
  base.txCount = legs.length;
  const g1 = legs.filter((l) => l.approval === 0).length;
  const g2 = legs.length - g1;
  base.perpsSecondApproval = perpsOpen && g2 > 0;
  base.approvals = perpsOpen ? chunkIndexes(g1, max).length + chunkIndexes(g2, max).length : chunkIndexes(legs.length, max).length;
  base.empty = legs.length === 0;
  return base;
}

/** Jupiter quote for the margin account (fork pools), exact in: the route's out and guaranteed minimum out. */
async function quoteJupiter(from: string, to: string, amountRaw: bigint, slippageBps: number): Promise<{ out: bigint; minOut: bigint }> {
  if (amountRaw <= 0n) return { out: 0n, minOut: 0n };
  const a = getToken(from), b = getToken(to);
  const dexes = encodeURIComponent("Raydium,Raydium CLMM,Raydium CP,Orca V2,Meteora DLMM,Whirlpool");
  try {
    const r = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${a.mint}&outputMint=${b.mint}&amount=${amountRaw}&slippageBps=${slippageBps}&dexes=${dexes}&maxAccounts=20`);
    if (!r.ok) return { out: 0n, minOut: 0n };
    const q = await r.json();
    return { out: BigInt(q.outAmount ?? 0), minOut: BigInt(q.otherAmountThreshold ?? q.outAmount ?? 0) };
  } catch {
    return { out: 0n, minOut: 0n };
  }
}

// ---------------------------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------------------------

/** A leg's live state in a run (FlashLegPlan + the chain's phase). */
export type FlashLegState = FlashLegPlan & { phase: LegPhase; reason?: string; signature?: string };

/**
 * What a run reports. `onLeg(id, phase, info)`: per leg, by its stable id (the multi-leg sheet's reducer takes ids). `onLegs`: the
 * full leg list whenever it changes (the second approval's legs are rebuilt from the chain after the closes, so their labels carry
 * the exact amounts). `cancel` / `stop`: see submit.ts BatchControl.
 */
export type FlashControl = {
  onStatus?: (s: "waiting_for_wallet" | "sending" | "confirming") => void;
  onLeg?: (id: string, phase: LegPhase, info?: LegInfo) => void;
  onLegs?: (legs: FlashLegState[]) => void;
  cancel?: AbortSignal;
  stop?: AbortSignal;
};

export type FlashResult = {
  legs: FlashLegState[];
  /** The done screen's words, from the chain read after the run (exact amounts). */
  title: string;
  line: string;
  lastSignature: string;
};

/**
 * The run ended before every leg landed (a leg failed, a check between stages failed, Stop, or Cancel on the second approval).
 * `legs` says which landed (done), which failed (with the decoded reason) and which were never sent (not-sent). Retry with
 * resumeFlashRepay(error.legs): it reads the chain again and builds, signs (one approval) and sends only what is left.
 * `name` is "StoppedError" after a Stop, so the sheet can tell it apart.
 */
export class FlashRepayError extends Error {
  readonly legs: FlashLegState[];
  readonly landed: FlashLegState[];
  readonly failed: FlashLegState[];
  readonly notSent: FlashLegState[];
  readonly stopped: boolean;
  /** The chain as it was before the first attempt (so a retry's done words cover the whole operation). Opaque. */
  readonly before?: unknown;
  constructor(message: string, legs: FlashLegState[], stopped = false, before?: unknown) {
    super(message);
    this.before = before;
    this.name = stopped ? "StoppedError" : "FlashRepayError";
    this.legs = legs;
    this.stopped = stopped;
    this.landed = legs.filter((l) => l.phase === "done");
    this.failed = legs.filter((l) => l.phase === "failed");
    this.notSent = legs.filter((l) => l.phase !== "done" && l.phase !== "failed");
  }
}

/** Builds one approval group's parts from a fresh plan (`group` 0 = closes when positions are open, else everything). */
async function buildGroup(owner: string, plan: Computed, slippageBps: number): Promise<{ parts: StagedPart[]; legs: FlashLegState[]; partLeg: number[] }> {
  const parts: StagedPart[] = [];
  const legs: FlashLegState[] = [];
  const partLeg: number[] = [];
  let stage = 0;
  const addLeg = (l: Omit<FlashLegPlan, "stage" | "approval">, built: FlashPart[], st: number) => {
    const li = legs.length;
    legs.push({ ...l, stage: st, approval: 0, phase: "waiting" });
    for (const b of built) {
      parts.push({ ...b, stage: st + b.offset });
      partLeg.push(li);
    }
  };
  if (plan.perps.length) {
    const closes = await buildFlashPerpsCloses(owner, slippageBps);
    closes.parts.forEach((p, i) => addLeg({ id: `close:${closes.closes[i].key}`, kind: "close", label: p.label, noun: `${closes.closes[i].key}-PERP` }, [p], 0));
    return { parts, legs, partLeg };
  }
  const proj: FlashProjection = { received: [] };
  const ph = await buildFlashPhoenixWithdraw(owner);
  if (ph) {
    addLeg({ id: "phoenix", kind: "phoenix", label: ph.parts[0].label, noun: "Phoenix USDC" }, ph.parts, stage);
    stage += ph.parts.length;
    proj.venueClosed = ph.venueCloses;
    proj.received!.push(getToken("USDC").mint);
  }
  if (plan.farm.length) {
    const exits = await Promise.all(plan.farm.map((f) => buildFlashFarmExit(owner, f.sym, f.receiptsRaw, { ...proj, received: [...proj.received!] })));
    exits.forEach((x, i) => addLeg({ id: `exit:${plan.farm[i].sym}`, kind: "exit", label: x.label, noun: `${plan.farm[i].sym} on Kamino` }, [x], stage));
    stage++;
    for (const f of plan.farm) proj.received!.push(getToken(f.sym).mint);
  }
  if (plan.swaps.length) {
    const built = await Promise.all(plan.swaps.map((s) => buildFlashSwap(owner, s.from, s.to, s.inRaw, slippageBps, { ...proj, received: [...proj.received!] })));
    built.forEach((b, i) => {
      const s = plan.swaps[i];
      // The route's guaranteed minimum must still cover what the plan counted (plan and build quote seconds apart; 0.5% slack).
      const to = getToken(s.to);
      if (ui(s.to, b.minOut) < s.minOut * 0.995) {
        throw new Error(`The ${s.from} to ${s.to} price moved (now at least ${fromRaw(b.minOut, to.decimals)} ${s.to}, planned ${s.minOut.toFixed(4)}). Nothing was signed. Try again.`);
      }
      // A swap that needs its receiving vault created first takes two stages; one that does not goes in the later one.
      addLeg({ id: `swap:${s.from}>${s.to}:${i}`, kind: "swap", label: b.parts[b.parts.length - 1].label, noun: `${s.from} to ${s.to}` }, b.parts, b.parts.length === 2 ? stage : stage + 1);
    });
    stage += 2;
    for (const s of plan.swaps) proj.received!.push(getToken(s.to).mint);
  }
  if (plan.loans.length) {
    const reps = await Promise.all(plan.loans.map((l) => buildFlashRepay(owner, l.sym, l.debtRaw)));
    reps.forEach((r, i) => addLeg({ id: `repay:${plan.loans[i].sym}`, kind: "repay", label: r.label, noun: `${plan.loans[i].sym} loan` }, [r], stage));
    stage++;
  }
  if (plan.toWallet && plan.sends.length) {
    const sends = await Promise.all(plan.sends.map((s) => buildFlashWithdraw(owner, s.sym, s.raw)));
    sends.forEach((s, i) => addLeg({ id: `send:${plan.sends[i].sym}`, kind: "send", label: s.label, noun: plan.sends[i].sym }, [s], stage));
  }
  // Legs number their stages by their first part.
  legs.forEach((l, li) => (l.stage = Math.min(...parts.filter((_, pi) => partLeg[pi] === li).map((p) => p.stage))));
  return { parts, legs, partLeg };
}

/** Sends one group; leg phases follow their parts (a leg is done when its last part landed). */
async function sendGroup(
  group: { parts: StagedPart[]; legs: FlashLegState[]; partLeg: number[] },
  all: FlashLegState[],
  control: FlashControl,
  maxPerApproval: number,
  between?: (stage: number) => Promise<void>,
): Promise<string[]> {
  const partsOf = (li: number) => group.partLeg.map((l, pi) => (l === li ? pi : -1)).filter((pi) => pi >= 0);
  const emit = () => control.onLegs?.(all.map((l) => ({ ...l })));
  const onLeg = (pi: number, phase: LegPhase, info?: LegInfo) => {
    const li = group.partLeg[pi];
    const leg = group.legs[li];
    if (!leg) return;
    const mine = partsOf(li);
    // A two-part leg is done only when its last part is; it fails or is not sent with any of its parts.
    if (phase === "done" && pi !== mine[mine.length - 1]) phase = "confirming";
    if (phase === "waiting" && pi !== mine[0]) return;
    if (phase === "not-sent" && leg.phase === "failed") return;
    leg.phase = phase;
    if (info?.reason) leg.reason = info.reason;
    if (info?.signature) leg.signature = info.signature;
    try {
      control.onLeg?.(leg.id, phase, info);
    } catch {
      // ignored
    }
    emit();
  };
  const batch: BatchControl & { maxPerApproval: number } = { onLeg, cancel: control.cancel, stop: control.stop, maxPerApproval };
  return sendSolanaStages(group.parts, { ...batch, computeUnits: EXEC_COMPUTE_UNITS, onStatus: (s) => control.onStatus?.(s === "signing" ? "waiting_for_wallet" : s === "sending" ? "sending" : s === "confirming" ? "confirming" : "waiting_for_wallet"), between });
}

/** What the done screen says, from the chain before and after (exact). */
function describe(before: Snapshot, after: Snapshot, toWallet: boolean): { title: string; line: string } {
  const b = before.account.margin, a = after.account.margin;
  const repaid = Object.entries(b?.debt ?? {}).filter(([sym, d]) => d.amount > 0 && !((a?.debt[sym]?.amount ?? 0) > 0));
  const left = Object.entries(a?.debt ?? {}).filter(([, d]) => d.amount > 0);
  const fmt = (n: number, sym: string) => `${n.toFixed(getToken(sym).decimals > 6 ? 4 : 2)} ${sym}`;
  const got = Object.entries(after.account.wallet)
    .map(([sym, v]) => [sym, v - (before.account.wallet[sym] ?? 0)] as const)
    .filter(([sym, d]) => d > (sym === "SOL" ? 0.001 : 0.000001));
  const stays = (a?.collateralUsd ?? 0) + Number(after.phoenix?.collateral ?? 0n) / 1e6;
  const title = left.length ? `Repaid ${repaid.length} of ${repaid.length + left.length} loans` : repaid.length ? `Repaid ${repaid.map(([s, d]) => fmt(d.amount, s)).join(", ")}` : "Positions closed";
  const parts: string[] = [];
  if (toWallet && got.length) parts.push(`${got.map(([s, d]) => fmt(d, s)).join(", ")} sent to your wallet`);
  parts.push(stays > 0.005 ? `$${stays.toFixed(2)} ${toWallet ? "stays" : "left"} in your margin account` : "Nothing left in your margin account");
  if (left.length) parts.push(`Still owed: ${left.map(([s, d]) => fmt(d.amount, s)).join(", ")}`);
  return { title, line: parts.join(". ") + "." };
}

/**
 * Runs Flash repay from the chain as it is now: plan, build, sign (one approval; two when Perps positions are open, the second
 * after the closes landed), send stage by stage. Resolves with the legs and the done words; rejects with WalletCancelledError
 * (nothing sent), FlashRepayError (partial: which legs landed / failed / were not sent) or the build error (nothing signed).
 * `prior`: legs that landed in an earlier attempt (shown as done; never rebuilt: the chain no longer has that work to do).
 */
export async function solanaFlashRepay(opts: FlashPlanOptions = {}, control: FlashControl = {}, prior: FlashLegState[] = [], priorBefore?: unknown): Promise<FlashResult> {
  const owner = requireActiveRealWallet("solana").full;
  const slippageBps = opts.slippageBps ?? 50;
  const max = opts.maxPerApproval ?? MAX_TX_PER_APPROVAL;
  const t0 = Date.now();
  const mark = (what: string) => {
    if (__DEV__) console.log(`[tx-time] flash ${((Date.now() - t0) / 1000).toFixed(1)}s ${what}`);
  };
  const plan = await compute(owner, opts);
  const before = (priorBefore as Snapshot | undefined) ?? plan._snap;
  if (plan.blocked) throw new Error(plan.blocked);
  if (plan.empty) throw new Error("Nothing to repay: the account has no loans, positions or Phoenix funds.");
  const all: FlashLegState[] = [...prior.filter((l) => l.phase === "done")];
  let last = "";
  const fail = (e: unknown, groupLegs: FlashLegState[]): never => {
    // Nothing landed and nothing was sent (cancelled, or a build / pre-sign check failed): the plain error, nothing signed or sent.
    if (!all.some((l) => l.phase === "done") && !(e instanceof BatchPartError)) throw e;
    for (const l of groupLegs) if (l.phase !== "done" && l.phase !== "failed") l.phase = "not-sent";
    const stopped = e instanceof StoppedError;
    const reason = e instanceof WalletCancelledError ? "Cancelled before the second approval: nothing after the closes was sent." : e instanceof Error ? e.message : String(e);
    const done = all.filter((l) => l.phase === "done").length;
    control.onLegs?.(all.map((l) => ({ ...l })));
    throw new FlashRepayError(stopped ? `Stopped. ${done} of ${all.length} done; the rest was not sent.` : `${done} of ${all.length} done. ${reason}`, all, stopped, before);
  };

  // Approval 1 (only with Perps positions open): the closes, sent together; then the chain must show every position closed.
  if (plan.perps.length) {
    mark("stage group 1: closes");
    const g1 = await buildGroup(owner, plan, slippageBps);
    // The rest of the run as planned now, shown as waiting until it is rebuilt after the closes.
    const rest = plan.legs.filter((l) => l.approval === 1).map((l) => ({ ...l, phase: "waiting" as LegPhase }));
    all.push(...g1.legs, ...rest);
    control.onLegs?.(all.map((l) => ({ ...l })));
    try {
      const sigs = await sendGroup(g1, all, control, max);
      last = sigs.filter(Boolean).pop() ?? last;
    } catch (e) {
      fail(e, all);
    }
    const ph = await readFlashPhoenix(owner);
    if (ph.positions.length) {
      for (const l of g1.legs) {
        if (ph.positions.some((p) => `close:${p.key}` === l.id)) {
          l.phase = "failed";
          l.reason = `No fill inside your ${slippageBps / 100}% price limit: the position is still open`;
        }
      }
      fail(new Error(`${ph.positions.map((p) => `${p.key}-PERP`).join(", ")} did not close (no fill inside your price limit). Nothing else was sent.`), all);
    }
    all.splice(all.length - rest.length, rest.length);
    if (control.stop?.aborted) {
      for (const l of rest) l.phase = "not-sent";
      all.push(...rest);
      fail(new StoppedError([], [], { landedIndex: [], notSent: [] }), all);
    }
  }

  // The (rest of the) run, built from the chain now: exact Phoenix withdraw, exits, swaps, repays, sends.
  const plan2 = plan.perps.length ? await compute(owner, opts) : plan;
  if (plan2.blocked) fail(new Error(plan2.blocked), all);
  if (!plan2.empty) {
    mark("stage group 2: build");
    let g2: Awaited<ReturnType<typeof buildGroup>>;
    try {
      g2 = await buildGroup(owner, plan2, slippageBps);
    } catch (e) {
      if (!all.length) throw e;
      fail(e, all);
    }
    const offset = Math.max(0, ...all.map((l) => l.stage + 1));
    g2!.legs.forEach((l) => {
      l.stage += offset;
      l.approval = plan.perps.length ? 1 : 0;
    });
    all.push(...g2!.legs);
    control.onLegs?.(all.map((l) => ({ ...l })));
    try {
      const sigs = await sendGroup(g2!, all, control, max);
      last = sigs.filter(Boolean).pop() ?? last;
    } catch (e) {
      fail(e, all);
    }
  }
  const after = await snapshot(owner);
  mark("done");
  return { legs: all, lastSignature: last, ...describe(before, after, plan.toWallet) };
}

/**
 * Retry after a FlashRepayError: retires every durable nonce an earlier signature could use (so no old signed leg can land
 * afterwards), checks on the chain which earlier legs landed, then runs Flash repay again from the chain as it is now: only the work
 * that is still there is built, signed (one new approval) and sent. Landed legs are never sent twice.
 */
export async function resumeFlashRepay(prev: FlashRepayError | FlashLegState[], opts: FlashPlanOptions = {}, control: FlashControl = {}): Promise<FlashResult> {
  const owner = requireActiveRealWallet("solana").full;
  const previous = Array.isArray(prev) ? prev : prev.legs;
  await retireForkNonces(owner, Math.max(previous.length + 4, MAX_TX_PER_APPROVAL * 2));
  const ok = await signaturesLanded(previous.map((l) => l.signature ?? ""));
  const landed = previous.map((l, i) => ({ ...l, phase: (ok[i] ? "done" : l.phase) as LegPhase })).filter((l) => l.phase === "done");
  return solanaFlashRepay(opts, control, landed, Array.isArray(prev) ? undefined : prev.before);
}

export { MAX_TX_PER_APPROVAL };
