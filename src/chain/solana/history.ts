import { Buffer } from "buffer";

import type { Activity, ChainData } from "@/sample/data";

import { decode58, findPda } from "./pda";
import { base58 } from "./prices";
import { rpc } from "./rpc";
import { KAMINO_RECEIPTS, MINT_SYMBOL, PERENA_VAULTS, PHOENIX_PROGRAM_ID, PHUSD_MINT, RESERVES, VANNA_PROGRAM_ID } from "./tokens";

/* Transaction history, read from the chain and decoded from the Vanna program's own Anchor events, the way the website
   does it (Vanna_Finance_Backend apps/solana/lib/solana/history.ts + lib/analytics/activity.ts). No indexer: the fork has
   none. Flow: getSignaturesForAddress(owner wallet, then the margin account for actions the owner did not sign, such as a
   liquidation) -> one getTransaction per new signature (the fork rejects batched JSON-RPC) with bounded concurrency ->
   decode the "Program data:" events the Vanna program logged and its emit_cpi! inner-instruction events.
   A signature never changes, so each one is read and decoded once (cache, also saved on the phone by the caller).
   Nothing is invented: an event that cannot be decoded gives no row, and amounts come only from the event itself. */

const EMBER_PROGRAM_ID = "EMBERpYNE6ehWmXymZZS2skiFmCa9V5dp14e1iduM5qy";
const PERENA_PROGRAM_ID = "save8RQVPMWNTzU18t3GBvBkN9hT7jsGjiCQ28FpD9H";
const BASIS_PROGRAM_ID = "GtuQoYxzytGKtLqQGkYrVbsaPHTZN5jboP25DrSmKvGr";
const SWAP_VIA: Record<string, string> = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter",
  T1TANpTeScyeqVzzgNViGDNrkQ6qHz9KrSBS4aNXvGT: "Titan",
};

// Anchor event discriminators (idl/vanna_credit_layer.json `events`).
const EV: Record<string, string> = {
  "1f299dc3eaf56beb": "LiquiditySupplied",
  "4e51d5b001548a41": "LiquidityRedeemed",
  ef8ae09589f231af: "MarginCreated",
  f43e4d0b87703d60: "CollateralDeposited",
  "33e0856a4aad4852": "CollateralWithdrawn",
  e1b6f14e2291fde6: "Borrowed",
  "910b38e19ad43669": "DebtRepaid",
  e739374b00aaf644: "Liquidated",
  "079820d77b868401": "MarginExecuted",
  d1026e52c3e0f044: "DebtWrittenOff",
};
const CPI_EVENT_TAG = "e445a52e51cb9a1d";

export type RowType =
  | "supply"
  | "redeem"
  | "create"
  | "deposit"
  | "withdraw"
  | "borrow"
  | "repay"
  | "liquidation"
  | "write-off"
  | "swap"
  | "farm-deposit"
  | "farm-withdraw"
  | "perp-fund"
  | "perp-settle"
  | "perp-order";

/** One decoded event. Raw amounts are decimal strings (bigint-safe and JSON-safe for the saved cache). */
export type ChainRow = {
  sig: string;
  ms: number;
  type: RowType;
  sym?: string;
  raw?: string;
  dec?: number;
  /** supply / redeem: vToken shares minted or burned. */
  shares?: string;
  /** swap: what came back. liquidation: the collateral seized. */
  toSym?: string;
  toRaw?: string;
  toDec?: number;
  /** farm rows: the position id the app uses (kamino-usdc, usdstar ...) and the receipt amount moved. */
  farmId?: string;
  receiptRaw?: string;
  via?: string;
  /** perp-order: the Phoenix market order the transaction placed (side 0 = buy, 1 = sell; spline = the market account). */
  order?: { side: number; lots: string; ticks?: string; reduceOnly: boolean; spline: string };
};

type Tx = {
  blockTime: number | null;
  meta: {
    err: unknown;
    logMessages?: string[] | null;
    innerInstructions?: { instructions: { programIdIndex: number; accounts: number[]; data: string }[] }[] | null;
    loadedAddresses?: { writable: string[]; readonly: string[] } | null;
    preTokenBalances?: { mint: string; uiTokenAmount: { decimals: number } }[] | null;
    postTokenBalances?: { mint: string; uiTokenAmount: { decimals: number } }[] | null;
  } | null;
  transaction: { message: { accountKeys: string[]; instructions: { programIdIndex: number; accounts: number[]; data: string }[] } };
} | null;

// ---- symbols and decimals ----
const RESERVE_SYM: Record<string, string> = Object.fromEntries(Object.entries(RESERVES).map(([s, r]) => [r.reserve, s]));
const KAMINO_BY_MINT = Object.fromEntries(KAMINO_RECEIPTS.map((k) => [k.collateralMint, k]));
const PERENA_BY_MINT = Object.fromEntries(PERENA_VAULTS.map((v) => [v.mint, v]));
const KNOWN_DEC: Record<string, number> = {
  ...Object.fromEntries(Object.values(RESERVES).map((r) => [r.mint, r.decimals])),
  ...Object.fromEntries(KAMINO_RECEIPTS.map((k) => [k.collateralMint, k.decimals])),
  ...Object.fromEntries(PERENA_VAULTS.map((v) => [v.mint, v.decimals])),
  [PHUSD_MINT]: 6,
};
const symOfMint = (m: string) => MINT_SYMBOL[m] ?? KAMINO_BY_MINT[m]?.symbol ?? PERENA_BY_MINT[m]?.name ?? (m === PHUSD_MINT ? "phUSD" : undefined);
const STABLE = new Set(["USDC", "USDT", "JupUSD", "phUSD", "USD*", "USD* Junior"]);

// ---- Borsh reader ----
class Reader {
  o = 8; // after the discriminator
  b: Buffer;
  constructor(b: Buffer) {
    this.b = b;
  }
  key() {
    const k = base58(this.b.subarray(this.o, this.o + 32));
    this.o += 32;
    return k;
  }
  u64() {
    const v = this.b.readBigUInt64LE(this.o);
    this.o += 8;
    return v;
  }
  i64() {
    const v = this.b.readBigInt64LE(this.o);
    this.o += 8;
    return v;
  }
  u128() {
    const v = this.b.readBigUInt64LE(this.o) + (this.b.readBigUInt64LE(this.o + 8) << 64n);
    this.o += 16;
    return v;
  }
  u8() {
    return this.b[this.o++];
  }
  amounts() {
    const n = this.b.readUInt32LE(this.o);
    this.o += 4;
    const out: { mint: string; amount: bigint }[] = [];
    for (let i = 0; i < n; i++) out.push({ mint: this.key(), amount: this.u64() });
    return out;
  }
}

type Ev = { name: string; r: Reader };
function eventOf(b: Buffer): Ev | null {
  if (b.length < 8) return null;
  // On the phone `buffer`'s subarray() returns a plain Uint8Array (its toString is "1,2,3", not hex): read the hex off the Buffer itself.
  const name = EV[b.toString("hex", 0, 8)];
  return name ? { name, r: new Reader(b) } : null;
}

/** Vanna events in a transaction: logged "Program data:" lines while the Vanna program is on top, plus emit_cpi! events. */
function vannaEvents(tx: NonNullable<Tx>): Ev[] {
  const out: Ev[] = [];
  const stack: string[] = [];
  for (const l of tx.meta?.logMessages ?? []) {
    const inv = /^Program (\w+) invoke \[\d+\]$/.exec(l);
    if (inv) {
      stack.push(inv[1]);
      continue;
    }
    if (/^Program \w+ (success|failed)/.test(l)) {
      stack.pop();
      continue;
    }
    if (l.startsWith("Program data: ") && stack[stack.length - 1] === VANNA_PROGRAM_ID) {
      try {
        const e = eventOf(Buffer.from(l.slice(14), "base64"));
        if (e) out.push(e);
      } catch {}
    }
  }
  const keys = [...tx.transaction.message.accountKeys, ...(tx.meta?.loadedAddresses?.writable ?? []), ...(tx.meta?.loadedAddresses?.readonly ?? [])];
  for (const g of tx.meta?.innerInstructions ?? []) {
    for (const ix of g.instructions) {
      if (keys[ix.programIdIndex] !== VANNA_PROGRAM_ID) continue;
      try {
        const data = Buffer.from(decode58(ix.data));
        if (data.toString("hex", 0, 8) !== CPI_EVENT_TAG) continue;
        const e = eventOf(Buffer.from(data.subarray(8)));
        if (e) out.push(e);
      } catch {}
    }
  }
  return out;
}

/** The Phoenix market orders in a transaction (top level or inside margin_execute), in order. Layout: marketOrderData() in actions.ts. */
function phoenixOrders(tx: NonNullable<Tx>): NonNullable<ChainRow["order"]>[] {
  const keys = [...tx.transaction.message.accountKeys, ...(tx.meta?.loadedAddresses?.writable ?? []), ...(tx.meta?.loadedAddresses?.readonly ?? [])];
  const ixs = [...tx.transaction.message.instructions, ...(tx.meta?.innerInstructions ?? []).flatMap((g) => g.instructions)];
  const out: NonNullable<ChainRow["order"]>[] = [];
  for (const ix of ixs) {
    if (keys[ix.programIdIndex] !== PHOENIX_PROGRAM_ID) continue;
    try {
      const d = Buffer.from(decode58(ix.data));
      if (d.length < 30 || d.toString("hex", 0, 8) !== "5a76c0fcc0632791") continue;
      const hasPrice = d[10] === 1;
      const lots = d.readBigUInt64LE(hasPrice ? 19 : 11);
      const ticks = hasPrice ? d.readBigUInt64LE(11) : undefined;
      const spline = keys[ix.accounts[ix.accounts.length - 1]];
      if (!spline) continue;
      out.push({ side: d[9], lots: lots.toString(), ticks: ticks?.toString(), reduceOnly: (d[d.length - 2] & 128) !== 0, spline });
    } catch {}
  }
  return out;
}

/** Decodes one transaction into rows for this owner (Earn) and this margin account (Margin, Spot, Farm, Perps). */
export function decodeTx(sig: string, tx: NonNullable<Tx>, owner: string, margin: string | null): ChainRow[] {
  const dec: Record<string, number> = { ...KNOWN_DEC };
  for (const b of [...(tx.meta?.preTokenBalances ?? []), ...(tx.meta?.postTokenBalances ?? [])]) dec[b.mint] = b.uiTokenAmount.decimals;
  const rows: ChainRow[] = [];
  const orders = phoenixOrders(tx);
  const ms0 = (tx.blockTime ?? 0) * 1000;
  const tok = (mint: string, raw: bigint) => {
    const sym = symOfMint(mint);
    const d = dec[mint];
    return sym && d !== undefined ? { sym, raw: raw.toString(), dec: d } : sym ? { sym } : {};
  };
  const res = (reserve: string, raw: bigint) => {
    const sym = RESERVE_SYM[reserve];
    return sym ? { sym, raw: raw.toString(), dec: RESERVES[sym].decimals } : {};
  };
  for (const { name, r } of vannaEvents(tx)) {
    try {
      const at = (ts: bigint) => (Number(ts) > 0 ? Number(ts) * 1000 : ms0);
      const push = (row: Omit<ChainRow, "sig">) => rows.push({ sig, ...row });
      if (name === "LiquiditySupplied" || name === "LiquidityRedeemed") {
        const reserve = r.key(), lender = r.key(), assets = r.u64(), shares = r.u64();
        r.u64();
        r.u64();
        const ts = r.i64();
        if (lender !== owner || !RESERVE_SYM[reserve]) continue;
        push({ ms: at(ts), type: name === "LiquiditySupplied" ? "supply" : "redeem", ...res(reserve, assets), shares: shares.toString() });
        continue;
      }
      const m = r.key();
      if (!margin || m !== margin) continue;
      switch (name) {
        case "MarginCreated": {
          r.key();
          push({ ms: at(r.i64()), type: "create" });
          break;
        }
        case "CollateralDeposited":
        case "CollateralWithdrawn": {
          const mint = r.key(), amount = r.u64();
          r.u64();
          if (name === "CollateralWithdrawn") r.u128();
          r.u64();
          push({ ms: at(r.i64()), type: name === "CollateralDeposited" ? "deposit" : "withdraw", ...tok(mint, amount) });
          break;
        }
        case "Borrowed": {
          const reserve = r.key(), assets = r.u64();
          r.u128();
          r.u128();
          r.u128();
          r.u64();
          push({ ms: at(r.i64()), type: "borrow", ...res(reserve, assets) });
          break;
        }
        case "DebtRepaid": {
          const reserve = r.key();
          r.key();
          const assets = r.u64();
          r.u128();
          r.u128();
          r.u64();
          push({ ms: at(r.i64()), type: "repay", ...res(reserve, assets) });
          break;
        }
        case "Liquidated": {
          r.key();
          const debtMint = r.key(), repaid = r.u64(), collMint = r.key(), seized = r.u64();
          r.u128();
          r.u128();
          r.u128();
          r.u8();
          r.u64();
          const ts = r.i64();
          const c = tok(collMint, seized);
          push({ ms: at(ts), type: "liquidation", ...tok(debtMint, repaid), toSym: c.sym, toRaw: c.raw, toDec: c.dec });
          break;
        }
        case "DebtWrittenOff": {
          const reserve = r.key();
          r.key();
          const assets = r.u64();
          r.u64();
          r.u128();
          r.u64();
          push({ ms: at(r.i64()), type: "write-off", ...res(reserve, assets) });
          break;
        }
        case "MarginExecuted": {
          const program = r.key();
          r.key();
          const spent = r.amounts(), received = r.amounts();
          r.u128();
          r.u64();
          const ms = at(r.i64());
          const usdcMint = RESERVES.USDC.mint;
          if (program === EMBER_PROGRAM_ID) {
            const out = spent.find((t) => t.mint === usdcMint), back = received.find((t) => t.mint === usdcMint);
            if (out) push({ ms, type: "perp-fund", ...tok(usdcMint, out.amount) });
            else if (back) push({ ms, type: "perp-settle", ...tok(usdcMint, back.amount) });
            break;
          }
          if (program === PHOENIX_PROGRAM_ID) {
            if (!spent.length && !received.length) push({ ms, type: "perp-order", order: orders.shift() });
            break;
          }
          const s = spent[0], g = received[0];
          if (program === PERENA_PROGRAM_ID || program === BASIS_PROGRAM_ID) {
            const into = g && PERENA_BY_MINT[g.mint], outOf = s && PERENA_BY_MINT[s.mint];
            if (into && s) push({ ms, type: "farm-deposit", ...tok(s.mint, s.amount), farmId: into.id, receiptRaw: g.amount.toString(), via: "Perena" });
            else if (outOf && g) push({ ms, type: "farm-withdraw", ...tok(g.mint, g.amount), farmId: outOf.id, receiptRaw: s.amount.toString(), via: "Perena" });
            break;
          }
          const kIn = g && KAMINO_BY_MINT[g.mint], kOut = s && KAMINO_BY_MINT[s.mint];
          if (kIn && s) push({ ms, type: "farm-deposit", ...tok(s.mint, s.amount), farmId: `kamino-${kIn.underlying.toLowerCase()}`, receiptRaw: g.amount.toString(), via: "Kamino" });
          else if (kOut && g) push({ ms, type: "farm-withdraw", ...tok(g.mint, g.amount), farmId: `kamino-${kOut.underlying.toLowerCase()}`, receiptRaw: s.amount.toString(), via: "Kamino" });
          else if (s || g) {
            const a = s ? tok(s.mint, s.amount) : {}, b = g ? tok(g.mint, g.amount) : {};
            push({ ms, type: "swap", ...a, toSym: b.sym, toRaw: b.raw, toDec: b.dec, via: SWAP_VIA[program] });
          }
          break;
        }
      }
    } catch {
      // a truncated event: no row rather than a wrong one
    }
  }
  return rows;
}

// ---- reading ----
const MAX_OWNER_SIGS = 200;
const MAX_MARGIN_SIGS = 100;
const PAGE = 100;
const CONCURRENCY = 6;

// signature -> decoded rows ([] = a real transaction with nothing of ours). Keyed per owner, because the same transaction
// decodes differently for different owners.
const cache = new Map<string, ChainRow[]>();
const ck = (owner: string, sig: string) => `${owner}:${sig}`;

/** Saved decodes from the phone (the caller persists them), so a restart does not re-read every transaction. */
export function seedHistoryCache(owner: string, entries: [string, ChainRow[]][]) {
  for (const [sig, rows] of entries) cache.set(ck(owner, sig), rows);
}
export function historyCacheFor(owner: string, sigs: string[]): [string, ChainRow[]][] {
  return sigs.flatMap((s) => {
    const v = cache.get(ck(owner, s));
    return v ? [[s, v] as [string, ChainRow[]]] : [];
  });
}

type Sig = { signature: string; err: unknown; blockTime?: number | null };
async function signatures(address: string, max: number): Promise<{ sigs: Sig[]; complete: boolean }> {
  const out: Sig[] = [];
  let before: string | undefined;
  while (out.length < max) {
    const limit = Math.min(PAGE, max - out.length);
    const page = await rpc<Sig[]>("getSignaturesForAddress", [address, { limit, ...(before ? { before } : {}), commitment: "confirmed" }]);
    out.push(...page);
    if (page.length < limit) return { sigs: out, complete: true };
    before = page[page.length - 1].signature;
  }
  return { sigs: out, complete: false };
}

export type ChainHistory = {
  rows: ChainRow[];
  /** Every successful signature that was looked at, newest first. */
  sigs: string[];
  /** True only when both scans reached the oldest transaction and every transaction could be read. */
  complete: boolean;
};

/** This wallet's Vanna history (and its margin account's), newest first. */
export async function fetchSolanaHistory(owner: string, _margin?: string | null): Promise<ChainHistory> {
  // The margin account is a PDA of the owner, so its address is known even before the account shows up in a read. Taking it from
  // the account read made a transaction decode with margin = null right after "open account" and cache it as empty for good.
  const margin = findPda(["margin", decode58(owner)], VANNA_PROGRAM_ID);
  const [own, mar] = await Promise.all([signatures(owner, MAX_OWNER_SIGS), margin ? signatures(margin, MAX_MARGIN_SIGS) : Promise.resolve({ sigs: [], complete: true })]);
  let complete = own.complete && mar.complete;
  const seen = new Set<string>();
  const list: Sig[] = [];
  for (const s of [...own.sigs, ...mar.sigs]) {
    if (s.err || seen.has(s.signature)) continue;
    seen.add(s.signature);
    list.push(s);
  }
  const todo = list.filter((s) => !cache.has(ck(owner, s.signature)));
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    await Promise.all(
      todo.slice(i, i + CONCURRENCY).map(async (s) => {
        try {
          const tx = await rpc<Tx>("getTransaction", [s.signature, { encoding: "json", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]);
          // not indexed yet: not cached, read again next time
          if (!tx) {
            complete = false;
            return;
          }
          if (tx.blockTime == null && s.blockTime) tx.blockTime = s.blockTime;
          cache.set(ck(owner, s.signature), tx.meta?.err ? [] : decodeTx(s.signature, tx, owner, margin));
        } catch {
          complete = false;
        }
      }),
    );
  }
  const rows = list.flatMap((s) => cache.get(ck(owner, s.signature)) ?? []);
  rows.sort((a, b) => b.ms - a.ms);
  return { rows, sigs: list.map((s) => s.signature), complete };
}

// ---- figures from the history ----
const ui = (raw: string | bigint | undefined, d: number | undefined) => (raw == null || d == null ? 0 : Number(BigInt(raw)) / 10 ** d);

/**
 * Lending interest earned per asset = current value - (supplied - redeemed), the website's computeEarnedInterest rule.
 * Trusted only when the history is complete for that asset: the shares from the decoded events must equal the wallet's
 * share balance now. Otherwise null (shares moved outside supply / redeem, or history older than the scan).
 */
export function lendEarnings(h: ChainHistory, held: Record<string, { sharesRaw: string; amt: number }>): Record<string, { net: number; earned: number } | null> {
  const out: Record<string, { net: number; earned: number } | null> = {};
  for (const [sym, pos] of Object.entries(held)) {
    let shares = 0n, assets = 0n;
    for (const r of h.rows) {
      if (r.sym !== sym || (r.type !== "supply" && r.type !== "redeem") || r.raw == null || r.shares == null) continue;
      const k = r.type === "supply" ? 1n : -1n;
      shares += k * BigInt(r.shares);
      assets += k * BigInt(r.raw);
    }
    if (shares !== BigInt(pos.sharesRaw)) {
      out[sym] = null;
      continue;
    }
    const dec = RESERVES[sym].decimals;
    const net = Number(assets) / 10 ** dec;
    // a few base units below zero is share / asset rounding (the share price only rises), not a loss
    const earned = pos.amt - net;
    out[sym] = { net, earned: earned < 0 && -earned < 1000 * 10 ** -dec ? 0 : earned };
  }
  return out;
}

/** Farm earnings per position, same rule: receipts from the decoded events must equal the receipts held now. */
export function farmEarnings(h: ChainHistory, held: { id: string; amt: number; receiptsRaw?: string }[]): Record<string, { net: number; earned: number } | null> {
  const out: Record<string, { net: number; earned: number } | null> = {};
  for (const f of held) {
    if (f.receiptsRaw == null) {
      out[f.id] = null;
      continue;
    }
    let receipts = 0n, net = 0, ok = true;
    for (const r of h.rows) {
      if (r.farmId !== f.id) continue;
      if (r.receiptRaw == null || r.raw == null) ok = false;
      const k = r.type === "farm-deposit" ? 1 : -1;
      receipts += BigInt(k) * BigInt(r.receiptRaw ?? "0");
      net += k * ui(r.raw, r.dec);
    }
    out[f.id] = ok && receipts === BigInt(f.receiptsRaw) ? { net, earned: f.amt - net } : null;
  }
  return out;
}

/**
 * Interest the margin account's loans have cost so far, USD: per asset, debt now + repaid - borrowed (repaid includes what a
 * liquidator repaid). Only with complete history and no written-off debt; null otherwise.
 */
export function interestPaidUsd(h: ChainHistory, debtNow: { sym: string; amt: number }[], price: (s: string) => number): number | null {
  if (!h.complete || h.rows.some((r) => r.type === "write-off")) return null;
  const by: Record<string, number> = {};
  for (const d of debtNow) by[d.sym] = (by[d.sym] ?? 0) + d.amt;
  for (const r of h.rows) {
    if (!r.sym) continue;
    if (r.type === "borrow") by[r.sym] = (by[r.sym] ?? 0) - ui(r.raw, r.dec);
    else if (r.type === "repay" || r.type === "liquidation") by[r.sym] = (by[r.sym] ?? 0) + ui(r.raw, r.dec);
  }
  let usd = 0;
  for (const [s, v] of Object.entries(by)) {
    const p = price(s);
    if (Math.abs(v) > 1e-9 && !(p > 0)) return null;
    usd += v * (p || 0);
  }
  return Math.max(0, usd);
}

/**
 * Realized perps profit, USD: USDC that came back from Phoenix + the trader's collateral now - USDC sent to Phoenix.
 * The trader's collateral already carries closed-trade profit, fees and funding; open positions' P&L is separate.
 */
export function perpsRealizedUsd(h: ChainHistory, traderCollateralUsd: number): number | null {
  if (!h.complete) return null;
  let v = traderCollateralUsd;
  for (const r of h.rows) {
    if (r.type === "perp-settle") v += ui(r.raw, r.dec);
    else if (r.type === "perp-fund") v -= ui(r.raw, r.dec);
  }
  return v;
}

/**
 * Net deposits into the margin account in USD: each deposit and withdrawal valued at its own time (a stablecoin = its amount,
 * anything else = the price the app saw when it first saw the row). null when any of them has no known price or the history is
 * incomplete: Net P&L then shows "—" instead of a made-up figure.
 */
export function netDepositsUsd(h: ChainHistory, pxAt: (sig: string, sym: string) => number | null): number | null {
  if (!h.complete) return null;
  let usd = 0;
  for (const r of h.rows) {
    if (r.type !== "deposit" && r.type !== "withdraw") continue;
    if (!r.sym || r.raw == null) return null;
    const p = STABLE.has(r.sym) ? 1 : pxAt(r.sig, r.sym);
    if (p == null || !(p > 0)) return null;
    usd += (r.type === "deposit" ? 1 : -1) * ui(r.raw, r.dec) * p;
  }
  return usd;
}

const day = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * Writes the history-backed figures into a freshly read account (DATA's shape):
 * - Earn: amt = net deposited, earned = value now - net deposited, since = first supply; else earnedUnknown (amt = value now).
 * - Farm: the same per position (Kamino, Perena).
 * - Margin: interest the loans cost so far; perps realized profit. Unknown ones are flagged and show "—", never 0.
 * `h` null = the history could not be read. `phoenixCash` null = the Phoenix trader account could not be read.
 */
export function applyHistoryFigures(d: ChainData, h: ChainHistory | null, hasMargin: boolean, phoenixCash: number | null, price: (s: string) => number) {
  const lend = h ? lendEarnings(h, Object.fromEntries(d.lend.filter((l) => l.sharesRaw != null).map((l) => [l.sym, { sharesRaw: l.sharesRaw!, amt: l.amt }]))) : {};
  for (const l of d.lend) {
    const e = lend[l.sym];
    if (!e || e.net <= 0) {
      l.earnedUnknown = true;
      continue;
    }
    l.amt = e.net;
    l.earned = e.earned;
    const first = h!.rows.filter((r) => r.type === "supply" && r.sym === l.sym).pop();
    if (first) l.since = day(first.ms);
  }
  const farm = h ? farmEarnings(h, d.farm) : {};
  for (const f of d.farm) {
    const e = farm[f.id];
    if (!e || e.net <= 0) {
      f.earnedUnknown = true;
      continue;
    }
    f.amt = e.net;
    f.earned = e.earned;
    const first = h!.rows.filter((r) => r.type === "farm-deposit" && r.farmId === f.id).pop();
    if (first) f.since = day(first.ms);
  }
  if (!hasMargin) return;
  const interest = h ? interestPaidUsd(h, d.margin.debt, price) : null;
  d.margin.interestPaid = interest ?? 0;
  d.margin.interestUnknown = interest == null;
  const realized = h && phoenixCash != null ? perpsRealizedUsd(h, phoenixCash) : null;
  d.realized = realized ?? 0;
  d.realizedUnknown = realized == null;
}

// ---- the History screen's rows ----
export const when = (ms: number) => {
  const d = new Date(ms);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const fmt = (raw: string | undefined, d: number | undefined, sym: string | undefined) => {
  if (raw == null || d == null || !sym) return sym ?? "";
  const n = ui(raw, d);
  return `${n.toLocaleString("en-US", { maximumFractionDigits: STABLE.has(sym) ? 2 : 6, minimumFractionDigits: STABLE.has(sym) ? 2 : 0 })} ${sym}`;
};
// Only a USD stablecoin gets a dollar value (its amount); others would need the price at the time, which the chain does not keep.
const usdOf = (raw: string | undefined, d: number | undefined, sym: string | undefined) => (raw != null && d != null && sym && STABLE.has(sym) && sym !== "USD* Junior" ? ui(raw, d) : undefined);

export function toActivity(rows: ChainRow[]): Activity[] {
  const out: Activity[] = [];
  for (const r of rows) {
    const a = fmt(r.raw, r.dec, r.sym);
    const base = { t: when(r.ms), ms: r.ms, hash: r.sig, chain: "solana" as const, tx: `${r.sig.slice(0, 4)}…${r.sig.slice(-4)}`, sym: r.sym, usd: usdOf(r.raw, r.dec, r.sym) };
    switch (r.type) {
      case "supply":
        out.push({ ...base, area: "Earn", action: "Supply", detail: `${r.sym} pool`, amt: a ? `+${a}` : "" });
        break;
      case "redeem":
        out.push({ ...base, area: "Earn", action: "Withdraw", detail: `${r.sym} pool`, amt: a ? `−${a}` : "" });
        break;
      case "create":
        out.push({ ...base, area: "Margin", action: "Account created", detail: "Margin account opened", amt: "", sym: "SOL" });
        break;
      case "deposit":
        out.push({ ...base, area: "Margin", action: "Deposit", detail: "Collateral into the margin account", amt: a });
        break;
      case "withdraw":
        out.push({ ...base, area: "Margin", action: "Withdraw", detail: "Collateral out of the margin account", amt: a });
        break;
      case "borrow":
        out.push({ ...base, area: "Margin", action: "Borrow", detail: `${r.sym} borrowed`, amt: a });
        break;
      case "repay":
        out.push({ ...base, area: "Margin", action: "Repay", detail: `${r.sym} debt repaid`, amt: a });
        break;
      case "write-off":
        out.push({ ...base, area: "Margin", action: "Written off", detail: `${r.sym} debt written off`, amt: a });
        break;
      case "liquidation": {
        const seized = fmt(r.toRaw, r.toDec, r.toSym);
        out.push({ ...base, area: "Margin", action: "Liquidated", detail: seized ? `${seized} seized to repay ${a || "the debt"}` : `Liquidator repaid ${a || "the debt"}`, amt: a ? `−${a}` : "" });
        break;
      }
      case "swap": {
        const b = fmt(r.toRaw, r.toDec, r.toSym);
        out.push({ ...base, area: "Spot", action: "Swap", detail: `${r.sym ?? "?"} to ${r.toSym ?? "?"}`, amt: [a && `−${a}`, b && `+${b}`].filter(Boolean).join(", "), via: r.via, sym: r.toSym ?? r.sym });
        break;
      }
      case "farm-deposit":
      case "farm-withdraw":
        out.push({ ...base, area: "Farm", action: r.type === "farm-deposit" ? "Deposit" : "Withdraw", detail: `${r.via} ${r.farmId?.startsWith("kamino") ? `${r.sym} Lending` : (PERENA_VAULTS.find((v) => v.id === r.farmId)?.name ?? "vault")}`, amt: a, via: r.via });
        break;
      case "perp-fund":
        out.push({ ...base, area: "Perps", action: "Deposit", detail: "USDC to Phoenix perps", amt: a });
        break;
      case "perp-settle":
        out.push({ ...base, area: "Perps", action: "Withdraw", detail: "USDC back from Phoenix perps", amt: a });
        break;
      case "perp-order":
        out.push({ ...base, area: "Perps", action: "Order", detail: "Phoenix perps market order", amt: "", sym: "USDC", usd: undefined });
        break;
    }
  }
  return out;
}
