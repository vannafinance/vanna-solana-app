import { Buffer } from "buffer";

import { MINT_SYMBOL, RESERVES, VANNA_PROGRAM_ID } from "./config";
import { fetchSolanaPools } from "./pools";
import { base58, fetchSolanaPrices } from "./prices";
import { decode58, findPda } from "./pda";
import { rpc } from "./rpc";

// A Solana user's own data on the Vanna fork, read from the chain with the web app's rules (apps/solana/lib/solana/
// margin.ts, math.ts health.rs port):
// - wallet: SOL plus every SPL / Token-2022 balance of the owner, named by the registry mints;
// - margin account: the program's MarginAccount whose `authority` is the owner (PDA "margin" + owner);
// - collateral: the token accounts the margin account owns; debt: its DebtPosition accounts, borrow shares turned into
//   assets against the reserve's (interest-projected) totals, rounded up;
// - health factor = collateral USD / debt USD; liquidatable at <= 1.10.
const TOKEN_PROGRAMS = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];

const DEBT_SIZE = 137; // 8 + margin 32 + reserve 32 + borrow_shares u128 16 + bump 1 + reserved 48
const LIQ = 1.1;

type Parsed = { account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number | null } } } } } };


export type SolanaAccount = {
  owner: string;
  wallet: Record<string, number>;
  margin: null | {
    address: string;
    collateral: Record<string, { amount: number; usd: number }>;
    debt: Record<string, { amount: number; usd: number }>;
    collateralUsd: number;
    debtUsd: number;
    healthFactor: number;
    collateralLeftBeforeLiquidation: number;
    netAvailableCollateral: number;
    leverage: number;
  };
};

async function tokenBalances(owner: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const programId of TOKEN_PROGRAMS) {
    const r = await rpc<{ value: Parsed[] }>("getTokenAccountsByOwner", [owner, { programId }, { encoding: "jsonParsed" }]);
    for (const a of r.value) {
      const { mint, tokenAmount } = a.account.data.parsed.info;
      const sym = MINT_SYMBOL[mint];
      if (sym && tokenAmount.uiAmount) out[sym] = (out[sym] ?? 0) + tokenAmount.uiAmount;
    }
  }
  return out;
}

// The margin account is the program address ("margin", owner); it exists once the user has created it.
export async function findSolanaMargin(owner: string): Promise<string | null> {
  const pda = findPda(["margin", decode58(owner)], VANNA_PROGRAM_ID);
  const r = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [pda, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]);
  return r.value ? pda : null;
}

export async function fetchSolanaAccount(owner: string): Promise<SolanaAccount> {
  const [lamports, tokens, marginAddr] = await Promise.all([rpc<{ value: number }>("getBalance", [owner]), tokenBalances(owner), findSolanaMargin(owner)]);
  const wallet = { ...tokens, SOL: (tokens.SOL ?? 0) + lamports.value / 1e9 };
  if (!marginAddr) return { owner, wallet, margin: null };

  const [prices, pools, coll, debts, reserveAccts] = await Promise.all([
    fetchSolanaPrices(),
    fetchSolanaPools(),
    tokenBalances(marginAddr),
    // one DebtPosition per reserve at ("debt", margin, reserve); missing = no debt there
    rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [Object.values(RESERVES).map((r) => findPda(["debt", decode58(marginAddr), decode58(r.reserve)], VANNA_PROGRAM_ID)), { encoding: "base64" }]),
    rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [Object.values(RESERVES).map((r) => r.reserve), { encoding: "base64" }]),
  ]);
  const collateral = Object.fromEntries(Object.entries(coll).map(([s, a]) => [s, { amount: a, usd: a * (prices[s] ?? 0) }]));
  // reserve totals: borrowed assets projected to now (pools) and the stored total borrow shares
  const syms = Object.keys(RESERVES);
  const shareTotals = Object.fromEntries(syms.map((s, i) => [RESERVES[s].reserve, reserveAccts.value[i] ? Buffer.from(reserveAccts.value[i]!.data[0], "base64").readBigUInt64LE(168) + (Buffer.from(reserveAccts.value[i]!.data[0], "base64").readBigUInt64LE(176) << 64n) : 0n]));
  const debt: Record<string, { amount: number; usd: number }> = {};
  for (const d of debts.value) {
    if (!d) continue;
    const b = Buffer.from(d.data[0], "base64");
    if (b.length < DEBT_SIZE) continue;
    const reserve = base58(b.subarray(40, 72));
    const shares = b.readBigUInt64LE(72) + (b.readBigUInt64LE(80) << 64n);
    const sym = syms.find((s) => RESERVES[s].reserve === reserve);
    const pool = pools.find((p) => p.sym === sym);
    const totalShares = shareTotals[reserve] ?? 0n;
    if (!sym || !pool || totalShares === 0n) continue;
    const dec = RESERVES[sym].decimals;
    const totalAssets = BigInt(Math.round(pool.bor * 10 ** dec));
    const raw = (shares * totalAssets + totalShares - 1n) / totalShares;
    const amount = Number(raw) / 10 ** dec;
    debt[sym] = { amount, usd: amount * (prices[sym] ?? 0) };
  }
  const collateralUsd = Object.values(collateral).reduce((t, b) => t + b.usd, 0);
  const debtUsd = Object.values(debt).reduce((t, b) => t + b.usd, 0);
  const equity = Math.max(0, collateralUsd - debtUsd);
  return {
    owner,
    wallet,
    margin: {
      address: marginAddr,
      collateral,
      debt,
      collateralUsd,
      debtUsd,
      healthFactor: debtUsd > 0 ? collateralUsd / debtUsd : Infinity,
      collateralLeftBeforeLiquidation: Math.max(0, collateralUsd - debtUsd * LIQ),
      netAvailableCollateral: equity,
      leverage: equity > 0.01 ? 1 + debtUsd / equity : 1,
    },
  };
}
