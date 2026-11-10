// World.xyz prediction markets. Ported from apps/solana/lib/predict (catalog, decode, prices, trade, maker).
// Markets and prices are read from Solana mainnet; trades run on the Vanna fork.
//
// FORK ONLY: on mainnet World's makers take the other side of a trade. On the fork the website's server plays that role
// with its own key, behind an access-gated API. The app does the same with a throwaway key held in memory: it only ever
// holds fork funds, topped up with the fork's cheat calls. Replace this with World's real route on mainnet.
import { ed25519 } from "@noble/curves/ed25519";
import { Buffer } from "buffer";

import { requireActiveRealWallet } from "@/chain/sign";

import { createAssociatedTokenAccountIdempotentIx, tokenAta, TOKEN_PROGRAM_ID, USDC_MINT } from "./actions";
import { FEATURED_EVENTS } from "./predict-featured";
import { decode58 } from "./pda";
import { base58 } from "./prices";
import { rpc } from "./rpc";
import { compileV0Message, pollSignatureStatus, type RawInstruction, sendSolanaInstructions, serializeTransaction } from "./submit";

const WORLD_PROGRAM = "prediCtPZCttYMvm2W3PtxmMxLmT1dtN7riU6Cxh6tM";
const CASH_MINT = "CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const JANUS_ORACLE_PROGRAM = "orafZ4BdfzikRRg498P23vG3EdEyMR7bYoYcD2zcwiD";
const JANUS_MAKER_MARKUP = 0.003;
const QUOTE_MAX_AGE_MS = 15 * 60_000;
const SPLIT = [0x7c, 0xbd, 0x1b, 0x2b, 0xd8, 0x28, 0x93, 0x42];
const MARKET_SIZE = 320;
const MIN_CASH = 0.1;
const MAX_CASH = 5_000;
const MAINNET_RPCS = ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];

type Acc = { data: [string, string]; owner: string; lamports: number } | null;
export type Prices = { yesAsk: number | null; noAsk: number | null; yesBid: number | null; noBid: number | null };
export type LiveOutcome = Prices & { marketId: string; name: string; yesMint: string; noMint: string };
export type LiveEvent = { id: string; title: string; cat: string; tag: string; ends: string; vol: number; source: string; rules: string; outs: LiveOutcome[] };
type Market = { id: string; yesMint: string; noMint: string; vault: string; startMs: number | null; endMs: number | null; kind: number };
type Meta = { name: string; symbol: string; uri: string };

async function mainnet<T>(method: string, params: unknown[]): Promise<T> {
  let last: unknown;
  for (const url of MAINNET_RPCS) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      if (!res.ok) throw new Error(`RPC ${res.status}`);
      const body = (await res.json()) as { result?: T; error?: { message?: string } };
      if (body.error) throw new Error(body.error.message ?? "RPC error");
      return body.result as T;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error("Market data is unavailable");
}

async function mainnetAccounts(keys: string[]): Promise<Acc[]> {
  const out: Acc[] = [];
  for (let i = 0; i < keys.length; i += 100) {
    out.push(...(await mainnet<{ value: Acc[] }>("getMultipleAccounts", [keys.slice(i, i + 100), { encoding: "base64" }])).value);
  }
  return out;
}

const toRaw = (ui: number) => BigInt(Math.round(ui * 1e6));
const b64 = (a: { data: [string, string] }) => Buffer.from(a.data[0], "base64");
const key = (d: Buffer, o: number) => base58(d.subarray(o, o + 32));
const isMs = (v: number) => v > 1.6e12 && v < 2.5e12;

function decodeMarket(id: string, d: Buffer): Market | null {
  if (d.length !== MARKET_SIZE || d.subarray(0, 8).toString("hex") !== "dbbed53700e3c69a" || key(d, 40) !== CASH_MINT) return null;
  const start = Number(d.readBigUInt64LE(258));
  const end = Number(d.readBigUInt64LE(266));
  return { id, yesMint: key(d, 72), noMint: key(d, 104), vault: key(d, 136), kind: d[224] ?? 0, startMs: isMs(start) ? start : null, endMs: isMs(end) ? end : null };
}

function parseMetadata(d: Buffer): Meta | null {
  let i = 166;
  while (i + 4 <= d.length) {
    const type = d.readUInt16LE(i);
    const len = d.readUInt16LE(i + 2);
    const value = d.subarray(i + 4, i + 4 + len);
    i += 4 + len;
    if (type !== 19) continue;
    let o = 64;
    const str = () => {
      const n = value.readUInt32LE(o);
      o += 4;
      const s = value.subarray(o, o + n).toString("utf8");
      o += n;
      return s;
    };
    try {
      return { name: str(), symbol: str(), uri: str() };
    } catch {
      return null;
    }
  }
  return null;
}

// Web math.ts:pricesFromQuote. World's own quote: oracle mid plus or minus the spread and the maker's markup.
function quotePrices(d: Buffer): Prices | null {
  if (d.length !== 112 || d[0] !== 1 || d[7] === 3) return null;
  const mid = Number(d.readBigUInt64LE(56)) / 1e6;
  const updatedMs = Number(d.readBigUInt64LE(16) / 1_000_000n);
  if (!(mid >= 0 && mid <= 1) || Date.now() - updatedMs > QUOTE_MAX_AGE_MS) return null;
  const s = d.readUInt32LE(72) / 1e6 + JANUS_MAKER_MARKUP;
  const side = (p: number) => {
    const r = Math.round(p * 1e6) / 1e6;
    return r > 0 && r < 1 ? r : null;
  };
  const p = { yesAsk: side(mid + s), noAsk: side(1 - mid + s), yesBid: side(mid - s), noBid: side(1 - mid - s) };
  return p.yesAsk === null && p.noAsk === null ? null : p;
}

let oracleOf: Map<string, string> | null = null;
async function oracleIndex(): Promise<Map<string, string>> {
  if (oracleOf) return oracleOf;
  const rows = await mainnet<{ pubkey: string; account: { data: [string, string] } }[]>("getProgramAccounts", [
    JANUS_ORACLE_PROGRAM,
    { encoding: "base64", filters: [{ dataSize: 112 }], dataSlice: { offset: 78, length: 32 } },
  ]);
  oracleOf = new Map(rows.map((r) => [base58(Buffer.from(r.account.data[0], "base64")), r.pubkey]));
  return oracleOf;
}

async function livePrices(marketIds: string[]): Promise<Map<string, Prices>> {
  const index = await oracleIndex();
  const known = marketIds.filter((id) => index.has(id));
  const accounts = await mainnetAccounts(known.map((id) => index.get(id)!));
  const out = new Map<string, Prices>();
  accounts.forEach((a, i) => {
    const p = a && quotePrices(b64(a));
    if (p) out.set(known[i], p);
  });
  return out;
}

// Web grouping.ts:classify, reduced to the categories the app shows.
function category(meta: Meta | undefined, image: string): { cat: string; tag: string } {
  const folder = image.match(/m\.world\.xyz\/([^/]+)\/[^/]+$/)?.[1]?.toLowerCase();
  if (folder === "politics") return { cat: "politics", tag: "Politics" };
  if (folder && folder !== "img") return { cat: "sports", tag: folder.toUpperCase() };
  const name = meta?.name ?? "";
  const symbol = meta?.symbol ?? "";
  if (/^(BTC|ETH|SOL|XRP|HYPE)-UP$/.test(symbol)) return { cat: "crypto", tag: "Crypto" };
  if (/^(CPI|GAS|NDX|SPX|FED|GDP|U3|WTI)-/.test(symbol)) return { cat: "economics", tag: "Economy" };
  if (/Democrat|Republican|nomination|President/i.test(name)) return { cat: "politics", tag: "Politics" };
  return { cat: "sports", tag: "Sports" };
}

const outcomeName = (name: string) =>
  name
    .replace(/\s*\(yes\)\s*$/i, "")
    .replace(/\s+wins?\s+[A-Z]{2,}\d{0,2}$/, "")
    .trim();

const SOURCES: Record<number, string> = { 1: "Pyth price feed", 2: "World.xyz (sports data)", 3: "World.xyz (sports data)", 4: "World.xyz (F1 data)", 5: "World.xyz" };
const dateOf = (ms: number | null) => (ms === null ? "Open" : new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));

/** World's Trending markets with live prices. Outcomes with no current quote are left out. */
export async function loadPredictEvents(): Promise<LiveEvent[]> {
  const ids = [...new Set(FEATURED_EVENTS.flatMap((e) => e.markets))];
  const marketAccts = await mainnetAccounts(ids);
  const markets = new Map<string, Market>();
  marketAccts.forEach((a, i) => {
    const m = a && a.owner === WORLD_PROGRAM ? decodeMarket(ids[i], b64(a)) : null;
    if (m && (m.endMs === null || m.endMs > Date.now())) markets.set(m.id, m);
  });
  const list = [...markets.values()];
  const vaults = [...new Set(list.map((m) => m.vault))];
  const [mints, vaultAccts, prices] = await Promise.all([mainnetAccounts(list.map((m) => m.yesMint)), mainnetAccounts(vaults), livePrices(list.map((m) => m.id))]);
  const meta = new Map<string, Meta>();
  mints.forEach((a, i) => {
    const parsed = a && parseMetadata(b64(a));
    if (parsed) meta.set(list[i].id, parsed);
  });
  const vaultCash = new Map(vaults.map((v, i) => [v, vaultAccts[i] ? Number(b64(vaultAccts[i]!).readBigUInt64LE(64)) / 1e6 : 0]));

  const firstUri = FEATURED_EVENTS.map((e) => e.markets.map((id) => meta.get(id)?.uri).find((u) => u?.startsWith("https://")));
  const docs = await Promise.all(
    firstUri.map(async (uri) => {
      if (!uri) return null;
      try {
        const res = await fetch(uri);
        return res.ok ? ((await res.json()) as { image?: string; description?: string }) : null;
      } catch {
        return null;
      }
    }),
  );

  return FEATURED_EVENTS.flatMap((e, i) => {
    const members = e.markets.flatMap((id) => {
      const m = markets.get(id);
      const p = prices.get(id);
      return m && p && meta.has(id) ? [{ m, p }] : [];
    });
    if (!members.length) return [];
    const first = meta.get(members[0].m.id);
    const { cat, tag } = category(first, docs[i]?.image ?? "");
    const ends = Math.max(...members.map(({ m }) => m.endMs ?? 0));
    return [
      {
        id: e.groupId ?? members[0].m.id,
        title: e.title,
        cat,
        tag,
        ends: dateOf(ends || null),
        vol: [...new Set(members.map(({ m }) => m.vault))].reduce((t, v) => t + (vaultCash.get(v) ?? 0), 0),
        source: SOURCES[members[0].m.kind] ?? "World.xyz",
        rules: docs[i]?.description ?? "Resolves on World.xyz.",
        outs: members.map(({ m, p }) => ({ ...p, marketId: m.id, name: outcomeName(meta.get(m.id)!.name), yesMint: m.yesMint, noMint: m.noMint })),
      },
    ];
  });
}

/** Whole-token Yes and No balances of each market, read from the fork. */
export async function predictPositions(owner: string, outs: LiveOutcome[]): Promise<{ marketId: string; side: "yes" | "no"; shares: number }[]> {
  const pairs = outs.flatMap((o) => [
    { marketId: o.marketId, side: "yes" as const, ata: tokenAta(owner, o.yesMint, TOKEN_2022) },
    { marketId: o.marketId, side: "no" as const, ata: tokenAta(owner, o.noMint, TOKEN_2022) },
  ]);
  const out: { marketId: string; side: "yes" | "no"; shares: number }[] = [];
  for (let i = 0; i < pairs.length; i += 100) {
    const chunk = pairs.slice(i, i + 100);
    const res = await rpc<{ value: Acc[] }>("getMultipleAccounts", [chunk.map((p) => p.ata), { encoding: "base64" }]);
    res.value.forEach((a, j) => {
      const shares = a ? Number(b64(a).readBigUInt64LE(64)) / 1e6 : 0;
      if (shares > 0) out.push({ marketId: chunk[j].marketId, side: chunk[j].side, shares });
    });
  }
  return out;
}

// ---- fork maker ------------------------------------------------------------------------------------

type Maker = { pubkey: string; sign: (message: Uint8Array) => Uint8Array };
let makerKey: Maker | null = null;

// Holds fork funds only, so it doesn't need strong randomness (Hermes has no crypto.getRandomValues without a polyfill).
function maker(): Maker {
  if (makerKey) return makerKey;
  const secret = Uint8Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
  makerKey = { pubkey: base58(ed25519.getPublicKey(secret)), sign: (m) => ed25519.sign(m, secret) };
  return makerKey;
}

async function tokenBalance(account: string): Promise<bigint> {
  const a = (await rpc<{ value: Acc }>("getAccountInfo", [account, { encoding: "base64" }])).value;
  return a ? b64(a).readBigUInt64LE(64) : 0n;
}

async function sendAsMaker(m: Maker, ixs: RawInstruction[]) {
  const latest = await rpc<{ value: { blockhash: string } }>("getLatestBlockhash", [{ commitment: "confirmed" }]);
  const { serialized } = compileV0Message(m.pubkey, ixs, latest.value.blockhash);
  const tx = serializeTransaction(serialized, [m.sign(serialized)]);
  await pollSignatureStatus(await rpc<string>("sendTransaction", [Buffer.from(tx).toString("base64"), { encoding: "base64" }]));
}

// A real transaction creates the maker's CASH account, so it carries every extension CASH requires (web maker.server.ts).
async function ensureMaker(): Promise<Maker> {
  const m = maker();
  const balance = await rpc<{ value: number }>("getBalance", [m.pubkey]);
  if (balance.value < 5e9) await rpc("surfnet_setAccount", [m.pubkey, { lamports: 50e9 }]);
  const cash = tokenAta(m.pubkey, CASH_MINT, TOKEN_2022);
  let account = (await rpc<{ value: Acc }>("getAccountInfo", [cash, { encoding: "base64" }])).value;
  if (!account) {
    await sendAsMaker(m, [createAssociatedTokenAccountIdempotentIx(m.pubkey, cash, m.pubkey, CASH_MINT, TOKEN_2022)]);
    account = (await rpc<{ value: Acc }>("getAccountInfo", [cash, { encoding: "base64" }])).value;
  }
  if (!account) throw new Error("Couldn't prepare the market maker");
  const data = b64(account);
  if (data.readBigUInt64LE(64) < 100_000_000_000n) {
    data.writeBigUInt64LE(1_000_000_000_000n, 64);
    await rpc("surfnet_setAccount", [cash, { lamports: account.lamports, data: data.toString("hex"), owner: account.owner, executable: false }]);
  }
  if ((await tokenBalance(tokenAta(m.pubkey, USDC_MINT, TOKEN_PROGRAM_ID))) < 100_000_000_000n) {
    await rpc("surfnet_setTokenAccount", [m.pubkey, USDC_MINT, { amount: 1_000_000_000_000 }, TOKEN_PROGRAM_ID]);
  }
  return m;
}

/** Ported from apps/solana/lib/predict/maker.server.ts:fundCashOnFork. Adds CASH on the fork, plus SOL for fees if the wallet is low. */
export async function fundCash(owner: string, cash = 1000): Promise<void> {
  const m = await ensureMaker();
  const sol = await rpc<{ value: number }>("getBalance", [owner]);
  if (sol.value < 0.2e9) await rpc("requestAirdrop", [owner, 1e9]);
  const ata = tokenAta(owner, CASH_MINT, TOKEN_2022);
  const read = async () => (await rpc<{ value: Acc }>("getAccountInfo", [ata, { encoding: "base64" }])).value;
  let account = await read();
  if (!account) {
    await sendAsMaker(m, [createAssociatedTokenAccountIdempotentIx(m.pubkey, ata, owner, CASH_MINT, TOKEN_2022)]);
    account = await read();
  }
  if (!account) throw new Error("Couldn't create your CASH account");
  const data = b64(account);
  data.writeBigUInt64LE(data.readBigUInt64LE(64) + toRaw(cash), 64);
  await rpc("surfnet_setAccount", [ata, { lamports: account.lamports, data: data.toString("hex"), owner: account.owner, executable: false }]);
}

const transfer = (mint: string, program: string, from: string, to: string, signer: string, amount: bigint): RawInstruction => {
  const data = Buffer.alloc(10);
  data[0] = 12; // TransferChecked
  data.writeBigUInt64LE(amount, 1);
  data[9] = 6;
  return {
    programId: program,
    keys: [
      { pubkey: from, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: to, isSigner: false, isWritable: true },
      { pubkey: signer, isSigner: true, isWritable: false },
    ],
    data,
  };
};

/**
 * Ported from apps/solana/lib/predict/trade.server.ts:buildTrade. Buying N shares for C at ask p (N = C / p): the maker adds
 * N - C, World's split turns N CASH into N Yes + N No, and the side you didn't pick goes to the maker. Selling sends the shares
 * to the maker for N x bid. USDC converts to CASH at par, as the review screen says.
 */
export async function predictTrade(opts: { marketId: string; outcome: "yes" | "no"; side: "buy" | "sell"; amount: number; pay?: "USDC" | "CASH" }): Promise<string> {
  if (opts.marketId.includes("/")) throw new Error("Predict markets aren't live in the app yet. Nothing was sent.");
  const owner = requireActiveRealWallet("solana").full;
  const pay = opts.pay ?? "USDC";
  const account = (await rpc<{ value: Acc }>("getAccountInfo", [opts.marketId, { encoding: "base64" }])).value;
  const market = account && account.owner === WORLD_PROGRAM ? decodeMarket(opts.marketId, b64(account)) : null;
  if (!market) throw new Error("This market is not available on the fork. It may have closed.");
  if (market.endMs !== null && market.endMs <= Date.now()) throw new Error("This market has closed for trading.");
  const prices = (await livePrices([market.id])).get(market.id);
  if (!prices) throw new Error("No live World price for this market right now. Nothing was sent.");

  const [want, other] = opts.outcome === "yes" ? [market.yesMint, market.noMint] : [market.noMint, market.yesMint];
  const m = await ensureMaker();
  const ataOf = (mint: string, who: string) => tokenAta(who, mint, TOKEN_2022);
  const userCash = ataOf(CASH_MINT, owner);
  const userUsdc = tokenAta(owner, USDC_MINT, TOKEN_PROGRAM_ID);
  const makerUsdc = tokenAta(m.pubkey, USDC_MINT, TOKEN_PROGRAM_ID);
  const ixs: RawInstruction[] = [];

  if (opts.side === "buy") {
    const price = opts.outcome === "yes" ? prices.yesAsk : prices.noAsk;
    if (price === null || !(price > 0 && price < 1)) throw new Error("No live World price for this side. Nothing was sent.");
    if (opts.amount < MIN_CASH || opts.amount > MAX_CASH) throw new Error(`Trade between ${MIN_CASH} and ${MAX_CASH} per order.`);
    const spend = toRaw(opts.amount);
    const out = BigInt(Math.floor(Number(spend) / price));
    if (out <= spend) throw new Error("Amount too small.");
    const have = await tokenBalance(pay === "USDC" ? userUsdc : userCash);
    if (have < spend) throw new Error(`Not enough ${pay} in your wallet.`);
    ixs.push(
      createAssociatedTokenAccountIdempotentIx(owner, userCash, owner, CASH_MINT, TOKEN_2022),
      createAssociatedTokenAccountIdempotentIx(owner, ataOf(market.yesMint, owner), owner, market.yesMint, TOKEN_2022),
      createAssociatedTokenAccountIdempotentIx(owner, ataOf(market.noMint, owner), owner, market.noMint, TOKEN_2022),
      createAssociatedTokenAccountIdempotentIx(m.pubkey, ataOf(other, m.pubkey), m.pubkey, other, TOKEN_2022),
    );
    if (pay === "USDC") ixs.push(transfer(USDC_MINT, TOKEN_PROGRAM_ID, userUsdc, makerUsdc, owner, spend));
    ixs.push(transfer(CASH_MINT, TOKEN_2022, ataOf(CASH_MINT, m.pubkey), userCash, m.pubkey, pay === "USDC" ? out : out - spend));
    const w = (pubkey: string) => ({ pubkey, isSigner: false, isWritable: true });
    const data = Buffer.alloc(16);
    Buffer.from(SPLIT).copy(data, 0);
    data.writeBigUInt64LE(out, 8);
    ixs.push({
      programId: WORLD_PROGRAM,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        w(market.id), w(CASH_MINT), w(market.yesMint), w(market.noMint), w(userCash), w(market.vault), w(ataOf(market.yesMint, owner)), w(ataOf(market.noMint, owner)),
        { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022, isSigner: false, isWritable: false },
      ],
      data,
    });
    ixs.push(transfer(other, TOKEN_2022, ataOf(other, owner), ataOf(other, m.pubkey), owner, out));
  } else {
    const price = opts.outcome === "yes" ? prices.yesBid : prices.noBid;
    if (price === null || !(price > 0 && price < 1)) throw new Error("No live World price for this side. Nothing was sent.");
    const held = await tokenBalance(ataOf(want, owner));
    let shares = toRaw(opts.amount);
    if (shares > held) shares = held;
    if (shares <= 0n) throw new Error("You don't hold these shares.");
    const proceeds = BigInt(Math.floor(Number(shares) * price));
    ixs.push(
      createAssociatedTokenAccountIdempotentIx(m.pubkey, ataOf(want, m.pubkey), m.pubkey, want, TOKEN_2022),
      createAssociatedTokenAccountIdempotentIx(owner, userUsdc, owner, USDC_MINT, TOKEN_PROGRAM_ID),
      transfer(want, TOKEN_2022, ataOf(want, owner), ataOf(want, m.pubkey), owner, shares),
      transfer(USDC_MINT, TOKEN_PROGRAM_ID, makerUsdc, userUsdc, m.pubkey, proceeds),
    );
  }

  return sendSolanaInstructions(ixs, { label: `Predict ${opts.side}`, computeUnits: 200_000, extraSigners: [m] });
}

export const predictDecode58 = decode58;
