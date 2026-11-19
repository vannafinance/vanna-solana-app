// Ported from apps/solana/lib/solana/server/fork-prices.ts:refreshForkPrices and lib/solana/price-refresh.ts
// FORK ONLY. The fork has no live price pusher and prices expire after an hour, so borrow and withdraw fail as "stale"
// unless the price accounts are rewritten first. The website does this through its server, whose API needs the site's
// access code, so the app writes the same accounts itself. Remove this when the app moves off the fork.
import { Buffer } from "buffer";

import type { AssetConfigState, OracleConfigState } from "./actions";
import { decode58 } from "./pda";
import { forkNow, rpc } from "./rpc";

const PYTH_RECEIVER = "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ";
const SCOPE_PROGRAM = "HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ";
const SYSTEM_KEY = "11111111111111111111111111111111";
const MAINNET_RPC = "https://api.mainnet-beta.solana.com";
const SCOPE_UNUSED = 65535;
const MIN_PRICE_ACCOUNT_SIZE = 133;
const MIN_INTERVAL_MS = 60_000;

// pyth.ts offsets
const PRICE_OFFSET = 73;
const CONF_OFFSET = 81;
const EXPONENT_OFFSET = 89;
const PUBLISH_TIME_OFFSET = 93;
const PREV_PUBLISH_TIME_OFFSET = 101;
const EMA_PRICE_OFFSET = 109;
const EMA_CONF_OFFSET = 117;

// Used only when Jupiter has no live price (same table as the website).
const REFERENCE_USD: Record<string, number> = { SOL: 190, USDC: 1, USDT: 1, JitoSOL: 240, JupSOL: 215, JupUSD: 1 };

type Acc = { data: [string, string]; lamports: number; owner: string };
type Priced = { symbol: string; mint: string };
export type PerpIndex = Priced & { oracle: OracleConfigState };

const PHOENIX_EXCHANGE = "2zskx2iyCvb6Stg7RBZkt1f6MrF4dpYtMG3yMvKwqtUZ";
const PHOENIX_PROGRAM = "EtrnLzgbS7nMMy5fbD42kXiUzGg8XQzJ972Xtk1cjWih";
const LAST_RESTART_SYSVAR = "SysvarLastRestartS1ot1111111111111111111111";
const PHOENIX_LAST_RESTART_OFFSET = 1096;

// Phoenix records the cluster's last restart slot and refuses every call while it differs from the fork's sysvar
// (web fork-prices.ts:alignPhoenixExchangeOnFork).
async function alignPhoenix() {
  const { value } = await rpc<{ value: (Acc | null)[] }>("getMultipleAccounts", [[PHOENIX_EXCHANGE, LAST_RESTART_SYSVAR], { encoding: "base64" }]);
  const exchange = value[0];
  if (!exchange) return;
  const data = Buffer.from(exchange.data[0], "base64");
  if (data.length < PHOENIX_LAST_RESTART_OFFSET + 8) return;
  const sysvar = value[1] ? Buffer.from(value[1].data[0], "base64") : null;
  const forkRestart = sysvar && sysvar.length >= 8 ? sysvar.readBigUInt64LE(0) : 0n;
  if (data.readBigUInt64LE(PHOENIX_LAST_RESTART_OFFSET) === forkRestart) return;
  data.writeBigUInt64LE(forkRestart, PHOENIX_LAST_RESTART_OFFSET);
  await rpc("surfnet_setAccount", [PHOENIX_EXCHANGE, { lamports: exchange.lamports, data: data.toString("hex"), owner: PHOENIX_PROGRAM, executable: false, rentEpoch: 0 }]);
}

const isSet = (k: string) => k !== SYSTEM_KEY;

async function jupiterPrices(tokens: readonly Priced[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${tokens.map((t) => t.mint).join(",")}`);
    if (!res.ok) return out;
    const body = (await res.json()) as Record<string, { usdPrice?: number }>;
    for (const t of tokens) {
      const p = body[t.mint]?.usdPrice;
      if (typeof p === "number" && p > 0) out[t.symbol] = p;
    }
  } catch {
    // falls back to the reference table below, as the website does
  }
  return out;
}

async function mainnetAccount(address: string): Promise<Acc | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const res = await fetch(MAINNET_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [address, { encoding: "base64" }] }),
      signal: ctl.signal,
    });
    const body = (await res.json()) as { result?: { value: Acc | null } };
    return body.result?.value ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Copies the live Scope account from mainnet (or restamps the fork's copy) and stamps the entries the program reads.
async function refreshScope(oracles: OracleConfigState[], now: bigint) {
  const byAccount = new Map<string, Set<number>>();
  for (const o of oracles) {
    if (!isSet(o.scopePrices)) continue;
    const set = byAccount.get(o.scopePrices) ?? new Set<number>();
    for (const e of [...o.scopeChain, ...o.scopeTwapChain]) if (e !== SCOPE_UNUSED) set.add(e);
    byAccount.set(o.scopePrices, set);
  }
  for (const [address, entries] of byAccount) {
    let source = await mainnetAccount(address);
    if (source?.owner !== SCOPE_PROGRAM) source = (await rpc<{ value: Acc | null }>("getAccountInfo", [address, { encoding: "base64" }])).value;
    if (source?.owner !== SCOPE_PROGRAM) throw new Error("Price data is unavailable. Try again shortly.");
    const data = Buffer.from(source.data[0], "base64");
    for (const entry of entries) data.writeBigUInt64LE(now, 40 + 56 * entry + 24);
    await rpc("surfnet_setAccount", [address, { lamports: source.lamports, data: data.toString("hex"), owner: SCOPE_PROGRAM, executable: false, rentEpoch: 0 }]);
  }
}

async function refresh(tokens: readonly Priced[], assets: Map<number, AssetConfigState>, perps: PerpIndex[]) {
  const [now, live] = await Promise.all([forkNow(), jupiterPrices([...tokens, ...perps.filter((p) => !tokens.some((t) => t.mint === p.mint))])]);
  // A perp market is priced like the token that stands in for it (SOL-PERP = SOL).
  for (const p of perps) {
    const token = tokens.find((t) => t.mint === p.mint);
    if (token && live[token.symbol] && !live[p.symbol]) live[p.symbol] = live[token.symbol];
  }
  const configs = [
    ...tokens.flatMap((token) => {
      const oracle = [...assets.values()].find((a) => a.mint === token.mint)?.oracle;
      return oracle ? [{ token, oracle }] : [];
    }),
    ...perps.map((p) => ({ token: p as Priced, oracle: p.oracle })),
  ];
  const scope = refreshScope(configs.map((c) => c.oracle), now);
  const align = perps.length ? alignPhoenix() : null;

  const usdOf = (sym: string) => live[sym] ?? REFERENCE_USD[sym];
  const byPyth = new Map(configs.filter((c) => isSet(c.oracle.pythPrice)).map((c) => [c.oracle.pythPrice, c.token.symbol]));
  const keys = [...byPyth.keys()];
  const infos = (await rpc<{ value: (Acc | null)[] }>("getMultipleAccounts", [keys, { encoding: "base64" }])).value;

  const written = new Set<string>();
  const writes: (() => Promise<unknown>)[] = [];
  for (const { token, oracle } of configs) {
    const address = oracle.pythPrice;
    if (!isSet(address) || written.has(address)) continue;
    written.add(address);
    const current = infos[keys.indexOf(address)];
    if (!current || current.owner !== PYTH_RECEIVER) continue;
    const data = Buffer.from(current.data[0], "base64");
    if (data.length < MIN_PRICE_ACCOUNT_SIZE) continue;
    const usd = usdOf(token.symbol);
    if (!usd) continue;
    let value = usd;
    if (isSet(oracle.pythFactor)) {
      // A feed paired with a factor publishes a rate, not USD (JupSOL/SOL).
      const factorSym = byPyth.get(oracle.pythFactor);
      const factorUsd = factorSym ? usdOf(factorSym) : undefined;
      if (!factorUsd) continue;
      value = usd / factorUsd;
    }
    const raw = BigInt(Math.round(value * 1e8));
    const conf = BigInt(Math.max(1, Math.round(value * 0.002 * 1e8)));
    data.writeBigInt64LE(raw, PRICE_OFFSET);
    data.writeBigUInt64LE(conf, CONF_OFFSET);
    data.writeInt32LE(-8, EXPONENT_OFFSET);
    data.writeBigInt64LE(now, PUBLISH_TIME_OFFSET);
    data.writeBigInt64LE(now - 1n, PREV_PUBLISH_TIME_OFFSET);
    data.writeBigInt64LE(raw, EMA_PRICE_OFFSET);
    data.writeBigUInt64LE(conf, EMA_CONF_OFFSET);
    writes.push(() => rpc("surfnet_setAccount", [address, { lamports: current.lamports, data: data.toString("hex"), owner: PYTH_RECEIVER, executable: false, rentEpoch: 0 }]));
  }
  await Promise.all([...writes.map((w) => w()), scope, align]);
}

// Kamino Reserve (klend) offsets: last_update.slot, liquidity.supply_vault, liquidity.available_amount.
const KAMINO_RESERVE_SLOT_OFFSET = 16;
const KAMINO_SUPPLY_VAULT_OFFSET = 160;
const KAMINO_AVAILABLE_OFFSET = 224;
const TOKEN_AMOUNT_OFFSET = 64;

/**
 * Kamino checks after every deposit and redeem that its liquidity vault minus the reserve's available_amount did not change, and
 * computes that difference without a guard (lending_checks.rs). The fork clones the reserve and its vault separately, each on first
 * use, so the two copies can be months apart: on 2026-11-19 the fork's USDT reserve was a copy from slot 451.6 M (1,840,151 USDT
 * available) next to a newer vault holding 763,450 USDT, and every Kamino USDT deposit failed its check with "attempt to subtract
 * with overflow" (ProgramFailedToComplete), whatever the health list. When the vault holds less than the reserve says is available,
 * the reserve, its vault and its receipt mint are copied from mainnet together (one read, so one slot). A consistent pair, fork
 * deposits included, is left alone. Never throws: returns whether it copied.
 */
export async function alignKaminoReserveOnFork(reserve: string, liquidityVault: string, collateralMint: string): Promise<boolean> {
  try {
    const { value } = await rpc<{ value: (Acc | null)[] }>("getMultipleAccounts", [[reserve, liquidityVault], { encoding: "base64", dataSlice: { offset: 0, length: KAMINO_AVAILABLE_OFFSET + 8 } }]);
    if (!value[0] || !value[1]) return false;
    const r = Buffer.from(value[0].data[0], "base64");
    const v = Buffer.from(value[1].data[0], "base64");
    if (r.length < KAMINO_AVAILABLE_OFFSET + 8 || v.length < TOKEN_AMOUNT_OFFSET + 8) return false;
    if (v.readBigUInt64LE(TOKEN_AMOUNT_OFFSET) >= r.readBigUInt64LE(KAMINO_AVAILABLE_OFFSET)) return false;
    const keys = [reserve, liquidityVault, collateralMint];
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const [slot, res] = await Promise.all([
      rpc<number>("getSlot", [{ commitment: "processed" }]),
      fetch(MAINNET_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [keys, { encoding: "base64" }] }),
        signal: ctl.signal,
      }).finally(() => clearTimeout(timer)),
    ]);
    const main = ((await res.json()) as { result?: { value: (Acc | null)[] } }).result?.value;
    if (!main || main.some((a) => !a)) return false;
    const datas = main.map((a) => Buffer.from(a!.data[0], "base64"));
    if (!datas[0].subarray(KAMINO_SUPPLY_VAULT_OFFSET, KAMINO_SUPPLY_VAULT_OFFSET + 32).equals(Buffer.from(decode58(liquidityVault)))) return false;
    // Interest accrues from last_update.slot to the fork's slot: a copy stamped after the fork's slot would not compute.
    if (datas[0].readBigUInt64LE(KAMINO_RESERVE_SLOT_OFFSET) > BigInt(slot)) datas[0].writeBigUInt64LE(BigInt(slot), KAMINO_RESERVE_SLOT_OFFSET);
    await Promise.all(keys.map((k, i) => rpc("surfnet_setAccount", [k, { lamports: main[i]!.lamports, data: datas[i].toString("hex"), owner: main[i]!.owner, executable: false, rentEpoch: 0 }])));
    if (__DEV__) console.log(`[fork] Kamino reserve ${reserve} was out of step with its vault: copied reserve, vault and receipt mint from mainnet`);
    return true;
  } catch {
    return false;
  }
}

let inflight: Promise<void> | null = null;
let lastAt = 0;

/**
 * Refreshes at most once a minute; concurrent callers share one refresh. A failure is rethrown so a borrow stops here.
 * `force`: refresh now (a signed transaction is about to be sent after a slow wallet approval and its check failed).
 */
export async function ensureFreshForkPrices(tokens: readonly Priced[], assets: Map<number, AssetConfigState>, perps: PerpIndex[] = [], force = false): Promise<void> {
  // A trade also needs its market's index price, which a token-only refresh doesn't touch.
  if (!force && !perps.length && Date.now() - lastAt < MIN_INTERVAL_MS) return;
  inflight ??= refresh(tokens, assets, perps)
    .then(() => {
      lastAt = Date.now();
    })
    .finally(() => {
      inflight = null;
    });
  await inflight;
}
