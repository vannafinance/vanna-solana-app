import { Buffer } from "buffer";

import type { Pool } from "@/sample/data";

import { RESERVES } from "./config";
import { forkNow, rpc } from "./rpc";

// Live Earn pools on Solana, read straight from the Vanna lending program's Reserve accounts on the mainnet fork, with the
// exact maths of the web app (apps/solana/lib/solana/math.ts, ports of the on-chain interest.rs / shares.rs):
// interest is projected to the fork clock, supplied = liquidity + borrows - protocol fees, borrow APR from the rate
// curve, supply APR = borrow x utilisation x (1 - reserve factor).
const WAD = 1_000_000_000_000_000_000n;
const HALF_WAD = WAD / 2n;
const SECONDS_PER_YEAR = 31_556_952n;

type Reserve = {
  liquidity: bigint; borrows: bigint; fees: bigint; last: bigint; reserveFactorBps: bigint;
  curve: { linear: bigint; jump: bigint; mult: bigint };
};

const u64 = (b: Buffer, o: number) => b.readBigUInt64LE(o);
const i64 = (b: Buffer, o: number) => b.readBigInt64LE(o);

// Reserve account (IDL vanna_credit_layer, after the 8-byte discriminator and four pubkeys).
function decodeReserve(b: Buffer): Reserve {
  return {
    liquidity: u64(b, 152), borrows: u64(b, 160), fees: u64(b, 200), last: i64(b, 208),
    curve: { linear: u64(b, 216), jump: u64(b, 224), mult: u64(b, 232) },
    reserveFactorBps: BigInt(b.readUInt16LE(240)),
  };
}

const utilWad = (liq: bigint, bor: bigint) => (liq + bor === 0n ? 0n : (bor * WAD) / (liq + bor));
function wadPow(base: bigint, exp: number): bigint {
  const mul = (a: bigint, c: bigint) => (a * c + HALF_WAD) / WAD;
  if (base === 0n) return exp === 0 ? WAD : 0n;
  let result = exp % 2 === 1 ? base : WAD, e = Math.floor(exp / 2), b = base;
  while (e > 0) { b = mul(b, b); if (e % 2 === 1) result = mul(result, b); e = Math.floor(e / 2); }
  return result;
}
function ratePerSecWad(c: Reserve["curve"], u: bigint): bigint {
  const poly = (u * c.linear) / WAD + (wadPow(u, 32) * c.linear) / WAD + (wadPow(u, 64) * c.jump) / WAD;
  return (c.mult * poly) / (SECONDS_PER_YEAR * WAD);
}
const annualBorrow = (c: Reserve["curve"], u: bigint) => Number((ratePerSecWad(c, u) * SECONDS_PER_YEAR * 1_000_000_000n) / WAD) / 1e9;

// Interest accrued to `now` (the fork clock), lenders' rounding as on-chain.
function project(r: Reserve, now: bigint): Reserve {
  const elapsed = now - r.last;
  if (elapsed <= 0n || r.borrows === 0n) return r;
  const growth = ratePerSecWad(r.curve, utilWad(r.liquidity, r.borrows)) * elapsed;
  const p = r.borrows * growth;
  const interest = p === 0n ? 0n : (p + WAD - 1n) / WAD;
  return { ...r, borrows: r.borrows + interest, fees: r.fees + (interest * r.reserveFactorBps) / 10_000n, last: now };
}

export async function fetchSolanaPools(): Promise<Pool[]> {
  const syms = Object.keys(RESERVES);
  const [now, accts] = await Promise.all([forkNow(), rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [syms.map((s) => RESERVES[s].reserve), { encoding: "base64" }])]);
  return syms.flatMap((sym, i) => {
    const a = accts.value[i];
    if (!a) return [];
    const r = project(decodeReserve(Buffer.from(a.data[0], "base64")), now);
    const d = 10 ** RESERVES[sym].decimals;
    const u = utilWad(r.liquidity, r.borrows);
    const util = Number((u * 1_000_000n) / WAD) / 1e6;
    const borrowApr = annualBorrow(r.curve, u);
    const supplyApr = borrowApr * util * (1 - Number(r.reserveFactorBps) / 10_000);
    return [{ sym, sup: Number(r.liquidity + r.borrows - r.fees) / d, bor: Number(r.borrows) / d, util: util * 100, borA: borrowApr * 100, supA: supplyApr * 100 }];
  });
}
