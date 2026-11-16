import { nativeToScVal } from "@stellar/stellar-base";

import { CONTRACTS, EARN_POOLS, VENUES } from "./config";
import { fetchBlendPositions } from "./farm";
import { fetchStellarPrices } from "./prices";
import { readContract } from "./read";

// A Stellar user's own data, read from the chain with the web app's credit-layer rules (apps/stellar/lib/margin-credit-reads.ts,
// credit-layer.ts, account-snapshot.ts):
// - wallet: token balances of the G-address (7-decimal token contracts);
// - margin account: CreditLayer.margin_of(owner);
// - debt: margin.debts() (token addresses) + reserve.debt_of(margin) (WAD);
// - collateral: the margin account's own token balances, plus its LP share tokens valued pro-rata from the pool reserves, plus Blend
//   supply read from the BlendValuer;
// - health factor = collateral / debt in USD from CreditLayer.margin_value (the contract's own valuation); the borrow and liquidation
//   limits are read from the contract (1.2 unless the admin moved them).
export const TOKENS: Record<string, string> = {
  XLM: EARN_POOLS.XLM.token,
  BLUSDC: EARN_POOLS.BLUSDC.token,
  AQUSDC: EARN_POOLS.AqUSDC.token,
  SOUSDC: EARN_POOLS.SoUSDC.token,
};
// The app's symbols for the same tokens.
export const APP_SYM: Record<string, string> = { XLM: "XLM", BLUSDC: "BLUSDC", AQUSDC: "AqUSDC", SOUSDC: "SoUSDC" };
const KEY_OF_TOKEN = Object.fromEntries(Object.entries(TOKENS).map(([k, t]) => [t, k]));
// Farm LP rows -> their pool (Soroswap pair / Aquarius pool), the share token the margin account holds, and how to read reserves.
const LP_POOLS: Record<string, { pool: string; share: string; reserves: string; shares: string; tokens: string }> = {
  SS_XLM_USDC: { pool: VENUES.SOROSWAP_XLM_USDC_PAIR, share: VENUES.SOROSWAP_XLM_USDC_PAIR, reserves: "get_reserves", shares: "total_supply", tokens: "token_0" },
  AQ_XLM_USDC: { pool: VENUES.AQUARIUS_XLM_USDC_POOL, share: VENUES.AQUARIUS_XLM_USDC_SHARE, reserves: "get_reserves", shares: "get_total_shares", tokens: "get_tokens" },
};
const DEFAULT_LIMIT = 1.2;
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
    blend: { XLM: number; USDC: number }; // what the account has supplied to Blend; counts as collateral
  };
};

const addr = (a: string) => nativeToScVal(a, { type: "address" });
const num = (v: unknown) => Number(BigInt(v as bigint));
const wadNum = (v: unknown) => Number(BigInt(v as bigint) / 10n ** 9n) / 1e9;

/** CreditLayer.margin_of(owner): the trader's margin account, or null when none exists yet. */
export async function findMarginAccount(owner: string): Promise<string | null> {
  const m = (await readContract(CONTRACTS.CREDIT_LAYER, "margin_of", addr(owner)).catch(() => null)) as string | null;
  return m ?? null;
}

/** The credit layer's live health limits (borrow_limit, liquidation_threshold), 1.2 when a read fails (a fresh deployment's value). */
export async function healthLimits(): Promise<{ borrow: number; liquidation: number }> {
  const [b, l] = await Promise.all([
    readContract(CONTRACTS.CREDIT_LAYER, "borrow_limit").catch(() => null),
    readContract(CONTRACTS.CREDIT_LAYER, "liquidation_threshold").catch(() => null),
  ]);
  return { borrow: b ? wadNum(b) : DEFAULT_LIMIT, liquidation: l ? wadNum(l) : DEFAULT_LIMIT };
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
  return xlmAmt * px.XLM + usdcAmt * (row === "AQ_XLM_USDC" ? px.AQUSDC : px.SOUSDC);
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

  const [debtTokens, raw, value, limits] = await Promise.all([
    (readContract(marginAddr, "debts").catch(() => [])) as Promise<string[]>,
    Promise.all(Object.entries(TOKENS).map(async ([k, c]) => [k, num(await readContract(c, "balance", addr(marginAddr)).catch(() => 0n)) / 1e7] as const)),
    readContract(CONTRACTS.CREDIT_LAYER, "margin_value", addr(marginAddr)).catch(() => null) as Promise<[bigint, bigint] | null>,
    healthLimits(),
  ]);
  // debt: one row per credit asset, from the reserve that lent it
  const debt: Record<string, Bal> = {};
  await Promise.all(
    [...new Set(debtTokens ?? [])].map(async (t) => {
      const k = KEY_OF_TOKEN[t];
      if (!k) return;
      const a = wadNum(await readContract(EARN_POOLS[APP_SYM[k]].pool, "debt_of", addr(marginAddr)));
      if (a > 0) debt[k] = { amount: a, usd: a * (px[k] ?? 0) };
    }),
  );
  const collateral: Record<string, Bal> = {};
  // the margin account's own token balances
  for (const [k, a] of raw) if (a > 0) collateral[k] = { amount: a, usd: a * (px[k] ?? 0) };
  // Farm LP shares: the share tokens the margin account holds directly, valued from the pool reserves
  await Promise.all(
    Object.keys(LP_POOLS).map(async (k) => {
      const shares = num(await readContract(LP_POOLS[k].share, "balance", addr(marginAddr)).catch(() => 0n)) / 1e7;
      if (shares > 0) collateral[k] = { amount: shares, usd: await lpUsd(k, shares, px).catch(() => 0) };
    }),
  );

  // Blend supply is the account's too: it counts in the account value and in the health factor
  const blend = await fetchBlendPositions(marginAddr).catch(() => ({ XLM: 0, USDC: 0 }));
  const blendUsd = blend.XLM * (px.XLM ?? 0) + blend.USDC * (px.BLUSDC ?? 0);

  // The contract's own valuation (Liquidation prices) wins; the sums are the fallback when that read fails.
  const sumDebt = Object.values(debt).reduce((t, b) => t + b.usd, 0);
  const sumColl = Object.values(collateral).reduce((t, b) => t + b.usd, 0) + blendUsd;
  const debtUsd = value ? wadNum(value[1]) : sumDebt;
  const gross = value ? wadNum(value[0]) : sumColl;
  const effDebt = debtUsd > DUST ? debtUsd : 0;
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
      collateralLeftBeforeLiquidation: Math.max(0, gross - effDebt * limits.liquidation),
      netAvailableCollateral: equity,
      leverage: equity > DUST ? 1 + effDebt / equity : 1,
      blend,
    },
  };
}
