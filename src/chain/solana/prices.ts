import { Buffer } from "buffer";

import { MINT_SYMBOL, PRICE_BOOK, PYTH_RECEIVER } from "./config";
import { forkNow, rpc } from "./rpc";

// Token prices exactly as the Vanna program reads them (web apps/solana/lib/solana/oracle.ts + pyth.ts): each token's
// OracleConfig from the oracle agent's PriceBook; Kamino Scope chain first, Pyth (optionally times a factor feed) as
// the fallback when Scope is missing or stale, newest wins. Ages are measured against the fork clock.
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function base58(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

const DEFAULT_KEY = "11111111111111111111111111111111";
const UNUSED = 65535;
type Cfg = { scope: string; scopeChain: number[]; pyth: string; factor: string; maxAge: bigint };
type Acc = { data: [string, string]; owner: string } | null;
type Quote = { usd: number; t: bigint };

function decodeBook(b: Buffer): Map<string, Cfg> {
  const out = new Map<string, Cfg>();
  for (let i = 0; i < b[9]; i++) {
    const at = 12 + 220 * i;
    if (b.length < at + 220) break;
    const c = at + 36;
    const key = (o: number) => base58(b.subarray(c + o, c + o + 32));
    out.set(base58(b.subarray(at, at + 32)), {
      scope: key(0),
      scopeChain: [0, 1, 2, 3].map((k) => b.readUInt16LE(c + 32 + 2 * k)),
      pyth: key(48),
      factor: key(80),
      maxAge: BigInt(b.readUInt32LE(c + 176)),
    });
  }
  return out;
}

function scopeQuote(b: Buffer, chain: number[]): Quote | null {
  const entries = chain.filter((e) => e !== UNUSED);
  if (!entries.length) return null;
  let value = 1n, exp = 0, t: bigint | null = null;
  for (const e of entries) {
    const at = 40 + 56 * e;
    if (b.length < at + 56) return null;
    const v = b.readBigUInt64LE(at);
    if (v === 0n) return null;
    value *= v;
    exp -= Number(b.readBigUInt64LE(at + 8));
    const ts = b.readBigUInt64LE(at + 24);
    t = t === null || ts < t ? ts : t;
  }
  return { usd: Number(value) * 10 ** exp, t: t ?? 0n };
}

const PYTH_DISC = Buffer.from([0x22, 0xf1, 0x23, 0x63, 0x9d, 0x7e, 0xf4, 0xcd]);
function pythQuote(a: Acc): Quote | null {
  if (!a || a.owner !== PYTH_RECEIVER) return null;
  const b = Buffer.from(a.data[0], "base64");
  // compared byte by byte: on Hermes, subarray() of the Buffer polyfill can return a plain Uint8Array (no .equals)
  if (b.length < 134 || PYTH_DISC.some((v, i) => b[i] !== v)) return null;
  return { usd: Number(b.readBigInt64LE(73)) * 10 ** b.readInt32LE(89), t: b.readBigInt64LE(93) };
}

export async function fetchSolanaPrices(): Promise<Record<string, number>> {
  const [now, bookAcc] = await Promise.all([forkNow(), rpc<{ value: Acc }>("getAccountInfo", [PRICE_BOOK, { encoding: "base64" }])]);
  if (!bookAcc.value) throw new Error("price book missing");
  const book = decodeBook(Buffer.from(bookAcc.value.data[0], "base64"));
  const wanted = [...book.entries()].filter(([mint]) => MINT_SYMBOL[mint]);
  const keys = [...new Set(wanted.flatMap(([, c]) => [c.scope, c.pyth, c.factor]).filter((k) => k !== DEFAULT_KEY))];
  const res = await rpc<{ value: Acc[] }>("getMultipleAccounts", [keys, { encoding: "base64" }]);
  const acc = new Map(keys.map((k, i) => [k, res.value[i]]));
  const out: Record<string, number> = {};
  for (const [mint, c] of wanted) {
    const fresh = (t: bigint) => (now >= t ? now - t : t - now) <= c.maxAge;
    let q: Quote | null = null;
    if (c.scope !== DEFAULT_KEY) {
      const a = acc.get(c.scope);
      q = a ? scopeQuote(Buffer.from(a.data[0], "base64"), c.scopeChain) : null;
    }
    if (c.pyth !== DEFAULT_KEY && !(q && fresh(q.t))) {
      const base = pythQuote(acc.get(c.pyth) ?? null);
      let fb: Quote | null = base;
      if (base && c.factor !== DEFAULT_KEY) {
        const f = pythQuote(acc.get(c.factor) ?? null);
        fb = f ? { usd: base.usd * f.usd, t: base.t < f.t ? base.t : f.t } : null;
      }
      if (fb && (!q || fb.t > q.t)) q = fb;
    }
    if (q && q.usd > 0) out[MINT_SYMBOL[mint]] = q.usd;
  }
  return out;
}
