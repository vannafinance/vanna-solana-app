import { nativeToScVal, xdr } from "@stellar/stellar-base";

import { CONTRACTS, EARN_POOLS, VENUES } from "./config";
import { readContract } from "./read";

// Stellar USD prices from the credit layer's oracle, as the web app's oracle-price.ts: get_price(asset, account, Liquidation) -> USD in
// WAD. Each USDC variant has its own feed. `account` only matters when pricing a venue position.
const LIQUIDATION = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Liquidation")]);

export async function oraclePriceUsd(asset: string, account: string = CONTRACTS.ADMIN): Promise<number> {
  const wad = (await readContract(CONTRACTS.ORACLE, "get_price", nativeToScVal(asset, { type: "address" }), nativeToScVal(account, { type: "address" }), LIQUIDATION)) as bigint;
  const v = Number(BigInt(wad) / 10n ** 9n) / 1e9;
  if (!Number.isFinite(v) || v <= 0) throw new Error(`bad price for ${asset}`);
  return v;
}

const FALLBACK: Record<string, number> = { XLM: 0.16, BLUSDC: 1, AqUSDC: 1, SoUSDC: 1 };

export async function fetchStellarPrices(): Promise<Record<string, number>> {
  const syms = Object.keys(EARN_POOLS);
  const out = await Promise.all(syms.map((s) => oraclePriceUsd(EARN_POOLS[s].token).catch(() => FALLBACK[s] ?? 1)));
  return Object.fromEntries(syms.map((s, i) => [s, out[i]]));
}

// LP share tokens are priced by the oracle too (Soroswap pair token, Aquarius share token).
export const lpPriceUsd = (row: "SS_XLM_USDC" | "AQ_XLM_USDC", account?: string) =>
  oraclePriceUsd(row === "SS_XLM_USDC" ? VENUES.SOROSWAP_XLM_USDC_PAIR : VENUES.AQUARIUS_XLM_USDC_SHARE, account);
