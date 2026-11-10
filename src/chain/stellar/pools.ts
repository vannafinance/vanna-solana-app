import { nativeToScVal } from "@stellar/stellar-base";

import type { Pool } from "@/sample/data";

import { CONTRACTS, EARN_POOLS, SECS_PER_YEAR } from "./config";
import { fromWad, readContract } from "./read";

// Live Earn pool stats on Stellar, with the web app's maths (apps/stellar/lib/pool-stats.ts and ContractService.getPoolStats):
// supplied = liquidity + borrows; utilisation = borrows / supplied; borrow rate from the RateModel contract
// (get_borrow_rate_per_sec x seconds per year); supply rate = borrow rate x utilisation (no reserve cut).
const toWad = (v: number) => BigInt(Math.floor(v * 1e18));

async function borrowRatePct(liquidity: number, borrows: number): Promise<number> {
  const perSec = await readContract(CONTRACTS.RATE_MODEL, "get_borrow_rate_per_sec", nativeToScVal(toWad(liquidity), { type: "u256" }), nativeToScVal(toWad(borrows), { type: "u256" }));
  return Number(BigInt(perSec as bigint) * BigInt(SECS_PER_YEAR)) / 1e16;
}

export async function fetchStellarPool(sym: string): Promise<Pool> {
  const c = EARN_POOLS[sym];
  if (!c) throw new Error(`No Stellar pool for ${sym}`);
  const [liq, bor, vs, vd] = await Promise.all([readContract(c.pool, "get_total_liquidity_in_pool"), readContract(c.pool, "get_borrows"), readContract(c.vToken, "total_supply").catch(() => null), readContract(c.vToken, "decimals").catch(() => 7)]);
  const liquidity = fromWad(liq), borrows = fromWad(bor);
  const sup = liquidity + borrows;
  const util = sup > 0 ? (borrows / sup) * 100 : 0;
  const borA = await borrowRatePct(liquidity, borrows);
  // vToken supply and its exchange rate (web pool-stats calculateExchangeRateFromPool: supplied / vToken supply)
  const vSupply = vs === null ? undefined : Number(vs as bigint) / 10 ** Number(vd);
  return { sym, sup, bor: borrows, util, borA, supA: (borA * util) / 100, vSupply, rate: vSupply ? sup / vSupply : undefined };
}

export async function fetchStellarPools(): Promise<Pool[]> {
  const out = await Promise.allSettled(Object.keys(EARN_POOLS).map(fetchStellarPool));
  return out.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}
