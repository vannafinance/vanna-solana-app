import type { Pool } from "@/sample/data";

import { EARN_POOLS, SECS_PER_YEAR } from "./config";
import { fromWad, readContract } from "./read";

// Live Earn reserve stats on Stellar, with the web app's maths (apps/stellar/lib/pool-stats.ts and ContractService.getPoolStats), now read
// from each credit-layer Reserve: supplied = total_assets (cash + debt); borrows = total_debt; utilisation = borrows / supplied;
// borrow rate = borrow_rate_per_sec x seconds per year; supply rate = borrow rate x utilisation (no ongoing reserve cut).
export async function fetchStellarPool(sym: string): Promise<Pool> {
  const c = EARN_POOLS[sym];
  if (!c) throw new Error(`No Stellar pool for ${sym}`);
  const [assets, debt, vs, perSec] = await Promise.all([
    readContract(c.pool, "total_assets"),
    readContract(c.pool, "total_debt"),
    readContract(c.pool, "total_supply").catch(() => null),
    readContract(c.pool, "borrow_rate_per_sec").catch(() => 0n),
  ]);
  const sup = fromWad(assets), borrows = fromWad(debt);
  const util = sup > 0 ? (borrows / sup) * 100 : 0;
  const borA = Number(BigInt(perSec as bigint) * BigInt(SECS_PER_YEAR)) / 1e16;
  // share supply (7 decimals) and its exchange rate (web pool-stats calculateExchangeRateFromPool: supplied / share supply)
  const vSupply = vs === null ? undefined : Number(vs as bigint) / 1e7;
  return { sym, sup, bor: borrows, util, borA, supA: (borA * util) / 100, vSupply, rate: vSupply ? sup / vSupply : undefined };
}

export async function fetchStellarPools(): Promise<Pool[]> {
  const out = await Promise.allSettled(Object.keys(EARN_POOLS).map(fetchStellarPool));
  return out.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}
