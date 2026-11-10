import { nativeToScVal } from "@stellar/stellar-base";

import { CONTRACTS } from "./config";
import { readContract } from "./read";

// Stellar USD prices from Vanna's oracle contract (`get_price_latest(symbol)` -> (price, decimals)), as the web app's
// oracle-price.ts. The pool USDC variants (BLUSDC, AqUSDC, SoUSDC) are priced as USDC, as on the web.
async function oraclePrice(symbol: string): Promise<number> {
  const [raw, dec] = (await readContract(CONTRACTS.ORACLE, "get_price_latest", nativeToScVal(symbol, { type: "symbol" }))) as [bigint, number];
  const v = Number(BigInt(raw)) / 10 ** Number(dec ?? 14);
  if (!Number.isFinite(v) || v <= 0) throw new Error(`bad ${symbol} price`);
  return v;
}

export async function fetchStellarPrices(): Promise<Record<string, number>> {
  const [xlm, usdc] = await Promise.all([oraclePrice("XLM"), oraclePrice("USDC")]);
  return { XLM: xlm, BLUSDC: usdc, AqUSDC: usdc, SoUSDC: usdc };
}
