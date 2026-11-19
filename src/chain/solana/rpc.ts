import { Buffer } from "buffer";

import { SOLANA_RPC } from "./config";

// Base64 to Buffer in one pass. The Buffer polyfill's Buffer.from(s, "base64") cleans the string with a regex, measures it, decodes
// and then copies byte by byte: for 100+ KB accounts (Phoenix's perp asset map, copied on every perps refresh) that was 2 to 3 s of
// JS time per read on Hermes. Same bytes for valid base64 (what the RPC returns); anything else falls back to the polyfill.
const B64 = (() => {
  const t = new Int16Array(128).fill(-1);
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let i = 0; i < abc.length; i++) t[abc.charCodeAt(i)] = i;
  return t;
})();
export function decodeBase64(s: string): Buffer {
  let len = s.length;
  while (len > 0 && s.charCodeAt(len - 1) === 61) len--; // "="
  if ((s.length & 3) !== 0 || s.length - len > 2) return Buffer.from(s, "base64");
  const out = Buffer.allocUnsafe((len * 3) >> 2);
  let o = 0, i = 0;
  for (; i + 4 <= len; i += 4) {
    const a = B64[s.charCodeAt(i)], b = B64[s.charCodeAt(i + 1)], c = B64[s.charCodeAt(i + 2)], d = B64[s.charCodeAt(i + 3)];
    if ((a | b | c | d) < 0) return Buffer.from(s, "base64");
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    out[o++] = n >> 16;
    out[o++] = (n >> 8) & 255;
    out[o++] = n & 255;
  }
  const rest = len - i;
  if (rest >= 2) {
    const a = B64[s.charCodeAt(i)], b = B64[s.charCodeAt(i + 1)], c = rest === 3 ? B64[s.charCodeAt(i + 2)] : 0;
    if ((a | b | c) < 0) return Buffer.from(s, "base64");
    const n = (a << 18) | (b << 12) | (c << 6);
    out[o++] = n >> 16;
    if (rest === 3) out[o++] = (n >> 8) & 255;
  } else if (rest === 1) return Buffer.from(s, "base64");
  return out;
}

/* The commitment for the account readers (balances, margin, Phoenix, farm, prices, pools). The RPC's default is "finalized", which on
   the fork trails "confirmed" by ~30 slots (~12 s): a read made after a transaction confirmed kept showing the old state, and when the
   transaction finalized between two pieces of one refresh (the Phoenix trader is read before the margin vaults), the refresh mixed
   both states (2026-11-19: 39.79 USDC returned from Phoenix counted in Phoenix AND in the margin account, health 27.18 instead of
   26.42). Every piece of an account read uses this one commitment; a transaction landing during a read is caught in account-live.ts. */
export const READ_AT = { commitment: "confirmed" } as const;

// Plain JSON-RPC to the Vanna Solana fork (no web3.js in the app).
export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(SOLANA_RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  if (!res.ok) throw new Error(`Solana RPC ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "Solana RPC error");
  return body.result as T;
}

// The fork's clock (Clock sysvar unix_timestamp): the program measures interest and price age against it, not wall time.
export async function forkNow(): Promise<bigint> {
  const clock = await rpc<{ value: { data: [string, string] } }>("getAccountInfo", ["SysvarC1ock11111111111111111111111111111111", { encoding: "base64" }]);
  return Buffer.from(clock.value.data[0], "base64").readBigInt64LE(32);
}
