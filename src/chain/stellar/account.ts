import { Address, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-base";

import { CONTRACTS, RPC_URLS } from "./config";
import { fetchStellarPrices } from "./prices";
import { readContract } from "./read";

// A Stellar user's own data, read from the chain with the web app's rules (apps/stellar/lib/account-snapshot.ts,
// margin-utils.ts, margin-health.ts, analytics/stellar/farmTrackingCollateral.ts):
// - wallet: token balances of the G-address (7-decimal token contracts);
// - margin account: found through AccountManager storage `SmartAccounts(owner)`, the last active one;
// - debt: get_all_borrowed_tokens + get_borrowed_token_debt (WAD);
// - collateral: the ledger rows (WAD), with the margin account's own raw token balances replacing XLM / BLUSDC /
//   AQUSDC / SOUSDC, and Farm LP rows valued pro-rata from the pool reserves;
// - health factor = gross collateral / debt (liquidation at 1.10), as the website's Net Health Factor.
export const TOKENS: Record<string, string> = {
  XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  BLUSDC: "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU",
  AQUSDC: "CAZRY5GSFBFXD7H6GAFBA5YGYQTDXU4QKWKMYFWBAZFUCURN3WKX6LF5",
  SOUSDC: "CB3TLW74NBIOT3BUWOZ3TUM6RFDF6A4GVIRUQRQZABG5KPOUL4JJOV2F",
};
// The app's symbols for the same tokens.
export const APP_SYM: Record<string, string> = { XLM: "XLM", BLUSDC: "BLUSDC", AQUSDC: "AqUSDC", SOUSDC: "SoUSDC" };
// Farm LP tracking rows -> their pool (Soroswap pair / Aquarius pool) and how to read reserves and total shares.
const LP_POOLS: Record<string, { pool: string; reserves: string; shares: string; tokens: string }> = {
  SS_XLM_USDC: { pool: "CDVAIOYHCD4RUSLQNVFI7RIZBFT2JZMJWM4RTOLQZQXL4QAVXU5RFKDB", reserves: "get_reserves", shares: "total_supply", tokens: "token_0" },
  AQ_XLM_USDC: { pool: "CD3LFMMLBQ6RBJUD3Z2LFDFE6544WDRMWHEZYPI5YDVESYRSO2TT32BX", reserves: "get_reserves", shares: "get_total_shares", tokens: "get_tokens" },
};
// Registry tracking token: the Farm LP shares a margin account holds, by symbol (7 decimals).
const TRACKING_TOKEN = "CC4P2DC4J3DTKNL7CQB42S3JSZNIVVHFJEMHZWTSDR233CT6O2KK7ZK2";
// The contracts name Blend's USDC "USDC" (and older aliases); the web folds them into one row (account-snapshot.ts).
const canonical = (t: string) => {
  const n = t.toUpperCase();
  if (n === "BLEND_USDC" || n === "USDC") return "BLUSDC";
  if (n === "AQUIRESUSDC" || n === "AQUARIUS_USDC") return "AQUSDC";
  if (n === "SOROSWAPUSDC" || n === "SOROSWAP_USDC") return "SOUSDC";
  return n;
};
const LIQ = 1.1;
const DUST = 0.01;

export type Bal = { amount: number; usd: number };
export type StellarAccount = {
  owner: string;
  wallet: Record<string, number>; // app symbols
  margin: null | {
    address: string;
    debt: Record<string, Bal>;
    collateral: Record<string, Bal>;
    debtUsd: number;
    grossCollateralUsd: number;
    healthFactor: number; // Infinity when no debt
    collateralLeftBeforeLiquidation: number;
    netAvailableCollateral: number;
    leverage: number;
  };
};

const addr = (a: string) => nativeToScVal(a, { type: "address" });
const sym = (s: string) => nativeToScVal(s, { type: "symbol" });
const num = (v: unknown) => Number(BigInt(v as bigint));

async function getLedgerEntry(key: xdr.LedgerKey): Promise<xdr.LedgerEntryData | null> {
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLedgerEntries", params: { keys: [key.toXDR("base64")] } }) });
      const body = (await res.json()) as { result?: { entries?: { xdr: string }[] } };
      const e = body.result?.entries?.[0];
      return e ? xdr.LedgerEntryData.fromXDR(e.xdr, "base64") : null;
    } catch {
      // next RPC
    }
  }
  throw new Error("getLedgerEntries failed on every RPC");
}

export async function findMarginAccount(owner: string): Promise<string | null> {
  const key = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(CONTRACTS.ACCOUNT_MANAGER).toScAddress(),
      key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("SmartAccounts"), addr(owner)]),
      durability: xdr.ContractDataDurability.persistent(),
    }),
  );
  const entry = await getLedgerEntry(key);
  if (!entry) return null;
  const list = scValToNative(entry.contractData().val()) as string[];
  for (let i = list.length - 1; i >= 0; i--) {
    const active = await readContract(list[i], "is_account_active").catch(() => null);
    if (active !== false) return list[i];
  }
  return null;
}

/** The pool's live XLM and USDC reserves, in whole tokens (web pool-action.tsx:useLpReserves). */
export async function lpReserves(row: "SS_XLM_USDC" | "AQ_XLM_USDC"): Promise<{ xlm: number; usdc: number }> {
  const p = LP_POOLS[row];
  const [reserves, tokens] = await Promise.all([readContract(p.pool, p.reserves), readContract(p.pool, p.tokens)]);
  const r = (reserves as bigint[]).map((x) => num(x) / 1e7);
  const first = Array.isArray(tokens) ? (tokens as string[])[0] : (tokens as string);
  return first === TOKENS.XLM ? { xlm: r[0], usdc: r[1] } : { xlm: r[1], usdc: r[0] };
}

async function lpUsd(row: string, shares: number, px: Record<string, number>): Promise<number> {
  const p = LP_POOLS[row];
  if (!p || !(shares > 0)) return 0;
  const [reserves, total, tokens] = await Promise.all([readContract(p.pool, p.reserves), readContract(p.pool, p.shares), readContract(p.pool, p.tokens)]);
  const r = (reserves as bigint[]).map((x) => num(x) / 1e7);
  const t = num(total) / 1e7;
  if (!(t > 0)) return 0;
  // Soroswap gives token_0 only; Aquarius gives both. The other side is the pool's other token.
  const first = Array.isArray(tokens) ? (tokens as string[])[0] : (tokens as string);
  const xlmFirst = first === TOKENS.XLM;
  const xlmAmt = (xlmFirst ? r[0] : r[1]) * (shares / t);
  const usdcAmt = (xlmFirst ? r[1] : r[0]) * (shares / t);
  return xlmAmt * px.XLM + usdcAmt * px.BLUSDC;
}

export async function fetchStellarAccount(owner: string): Promise<StellarAccount> {
  const prices = await fetchStellarPrices();
  const px: Record<string, number> = { XLM: prices.XLM, BLUSDC: prices.BLUSDC, AQUSDC: prices.AqUSDC, SOUSDC: prices.SoUSDC };
  const [walletRaw, marginAddr] = await Promise.all([
    Promise.all(Object.entries(TOKENS).map(async ([k, c]) => [k, num(await readContract(c, "balance", addr(owner)).catch(() => 0n)) / 1e7] as const)),
    findMarginAccount(owner),
  ]);
  const wallet = Object.fromEntries(walletRaw.map(([k, v]) => [APP_SYM[k], v]));
  if (!marginAddr) return { owner, wallet, margin: null };

  const [borrowedSyms, collSyms, raw] = await Promise.all([
    readContract(marginAddr, "get_all_borrowed_tokens") as Promise<string[]>,
    readContract(marginAddr, "get_all_collateral_tokens") as Promise<string[]>,
    Promise.all(Object.entries(TOKENS).map(async ([k, c]) => [k, num(await readContract(c, "balance", addr(marginAddr)).catch(() => 0n)) / 1e7] as const)),
  ]);
  // debt: one row per canonical token, keeping the larger reading when aliases repeat (as the web dedupes)
  const debt: Record<string, Bal> = {};
  await Promise.all(
    [...new Set(borrowedSyms)].map(async (s) => {
      const a = num(await readContract(marginAddr, "get_borrowed_token_debt", sym(s))) / 1e18;
      const k = canonical(s);
      if (a > 0 && a > (debt[k]?.amount ?? 0)) debt[k] = { amount: a, usd: a * (px[k] ?? 0) };
    }),
  );
  const collateral: Record<string, Bal> = {};
  // ledger rows the raw token balances don't cover (anything but XLM / BLUSDC / AQUSDC / SOUSDC and the LP rows)
  await Promise.all(
    [...new Set(collSyms)].map(async (s) => {
      const k = canonical(s);
      if (TOKENS[k] || LP_POOLS[k]) return;
      const a = num(await readContract(marginAddr, "get_collateral_token_balance", sym(s))) / 1e18;
      if (a > 0) collateral[k] = { amount: a, usd: 0 };
    }),
  );
  // the margin account's own token balances
  for (const [k, a] of raw) if (a > 0) collateral[k] = { amount: a, usd: a * (px[k] ?? 0) };
  // Farm LP shares from the tracking token (Aquarius falls back to the pool's own share count), valued from reserves
  await Promise.all(
    Object.keys(LP_POOLS).map(async (k) => {
      let shares = num(await readContract(TRACKING_TOKEN, "balance", addr(marginAddr), sym(k)).catch(() => 0n)) / 1e7;
      if (!(shares > 0) && k === "AQ_XLM_USDC") shares = num(await readContract(LP_POOLS[k].pool, "get_user_shares", addr(marginAddr)).catch(() => 0n)) / 1e7;
      if (!(shares > 0) && k === "SS_XLM_USDC") shares = num(await readContract(LP_POOLS[k].pool, "balance", addr(marginAddr)).catch(() => 0n)) / 1e7;
      if (shares > 0) collateral[k] = { amount: shares, usd: await lpUsd(k, shares, px).catch(() => 0) };
    }),
  );

  const debtUsd = Object.values(debt).reduce((t, b) => t + b.usd, 0);
  const effDebt = debtUsd > DUST ? debtUsd : 0;
  const gross = Object.values(collateral).reduce((t, b) => t + b.usd, 0);
  const equity = Math.max(0, gross - effDebt);
  return {
    owner,
    wallet,
    margin: {
      address: marginAddr,
      debt,
      collateral,
      debtUsd,
      grossCollateralUsd: gross,
      healthFactor: effDebt > 0 ? gross / effDebt : Infinity,
      collateralLeftBeforeLiquidation: Math.max(0, gross - effDebt * LIQ),
      netAvailableCollateral: equity,
      leverage: equity > DUST ? 1 + effDebt / equity : 1,
    },
  };
}
