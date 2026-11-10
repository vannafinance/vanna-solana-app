import { nativeToScVal } from "@stellar/stellar-base";

import { fetchStellarPrices } from "./prices";
import { readContract } from "./read";

// Stellar Farm vaults, read from the chain with the web app's maths (apps/stellar/lib/blend-utils.ts _parseReserveData,
// rate-display.ts): Blend reserves from the pool's get_reserve(asset): supplied = b_supply x b_rate, borrowed =
// d_supply x d_rate, three-tier rate curve with ir_mod, borrow APY compounded daily, supply APR = borrow APR x util x
// (1 - 10% backstop) compounded weekly. LP pools: TVL = reserves priced at the oracle.
const BLEND_POOL = "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF";
const BLEND_ASSETS = { XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", USDC: "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU" };
const LP = {
  soroswap: { pool: "CDVAIOYHCD4RUSLQNVFI7RIZBFT2JZMJWM4RTOLQZQXL4QAVXU5RFKDB", first: "token_0" },
  aquarius: { pool: "CD3LFMMLBQ6RBJUD3Z2LFDFE6544WDRMWHEZYPI5YDVESYRSO2TT32BX", first: "get_tokens" },
};
const XLM = BLEND_ASSETS.XLM;

export type BlendReserve = { supplied: number; borrowed: number; util: number; supplyApy: number; borrowApy: number };
type RawReserve = { data: Record<string, bigint>; config: Record<string, bigint | number> };

function parse(r: RawReserve): BlendReserve {
  const S7 = 1e7, S12 = 1e12, n = (v: unknown) => Number(v);
  const bRate = n(r.data.b_rate), bSupply = n(r.data.b_supply), dRate = n(r.data.d_rate), dSupply = n(r.data.d_supply), irMod = n(r.data.ir_mod);
  const rBase = n(r.config.r_base), rOne = n(r.config.r_one), rTwo = n(r.config.r_two), rThree = n(r.config.r_three), target = n(r.config.util) / S7;
  const supplied = (bSupply / S7) * (bRate / S12), borrowed = (dSupply / S7) * (dRate / S12);
  const u = supplied > 0 ? borrowed / supplied : 0;
  let ir: number;
  if (u <= target) ir = ((((target > 0 ? (u / target) * S7 : 0) * rOne) / S7 + rBase) * irMod) / S7;
  else if (u <= 0.95) ir = ((((u - target) / (0.95 - target)) * S7 * rTwo) / S7 + rOne + rBase) * irMod / S7;
  else ir = (((u - 0.95) / 0.05) * S7 * rThree) / S7 + ((rTwo + rOne + rBase) * irMod) / S7;
  const borrowApr = ir / S7;
  const supplyApr = borrowApr * u * 0.9;
  return { supplied, borrowed, util: u * 100, borrowApy: (Math.pow(1 + borrowApr / 365, 365) - 1) * 100, supplyApy: Math.max(0, (Math.pow(1 + supplyApr / 52, 52) - 1) * 100) };
}

export async function fetchBlendReserves(): Promise<Record<"XLM" | "USDC", BlendReserve>> {
  const [x, u] = await Promise.all(Object.values(BLEND_ASSETS).map((a) => readContract(BLEND_POOL, "get_reserve", nativeToScVal(a, { type: "address" })) as Promise<RawReserve>));
  return { XLM: parse(x), USDC: parse(u) };
}

const AQUARIUS_API = "https://amm-api-testnet.aqua.network";

// Same rule as the website: Aquarius APR is the AMM API base trading APY; Soroswap's testnet API has none, so 0.
async function aquariusApr(): Promise<number> {
  const id = LP.aquarius.pool.toUpperCase();
  for (let page = 1; page <= 8; page++) {
    const res = await fetch(`${AQUARIUS_API}/pools/?page=${page}`);
    if (!res.ok) return 0;
    const json = (await res.json()) as { items?: { address?: string; apy?: string }[]; next?: string | null };
    const pool = (json.items ?? []).find((p) => (p.address ?? "").toUpperCase() === id);
    if (pool) {
      const apy = parseFloat(pool.apy ?? "");
      return Number.isFinite(apy) && apy > 0 ? apy * 100 : 0;
    }
    if (!json.next) break;
  }
  return 0;
}

export type LpStats = { tvl: number; apr: number };

// TVL of the two XLM / USDC LP pools, in USD (reserves × oracle price, as the site). APR follows the site.
export async function fetchLpTvl(): Promise<Record<"soroswap" | "aquarius", LpStats>> {
  const px = await fetchStellarPrices();
  const one = async (p: { pool: string; first: string }) => {
    const [res, tokens] = await Promise.all([readContract(p.pool, "get_reserves"), readContract(p.pool, p.first)]);
    const r = (res as bigint[]).map((v) => Number(v) / 1e7);
    const first = Array.isArray(tokens) ? (tokens as string[])[0] : (tokens as string);
    const [xlm, usdc] = first === XLM ? [r[0], r[1]] : [r[1], r[0]];
    return xlm * px.XLM + usdc * px.BLUSDC;
  };
  const [soroswap, aquarius, apr] = await Promise.all([one(LP.soroswap), one(LP.aquarius), aquariusApr()]);
  return { soroswap: { tvl: soroswap, apr: 0 }, aquarius: { tvl: aquarius, apr } };
}
