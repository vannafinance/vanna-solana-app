import { Buffer } from "buffer";

import type { FarmPos, LendPos, PerpPos } from "@/sample/data";

import { decode58, findAta, findPda, TOKEN_PROGRAM_ID } from "./derive";
import { READ_AT, rpc } from "./rpc";
import {
  KAMINO_RECEIPTS,
  PERENA_VAULTS,
  PHOENIX_MARKETS,
  PHOENIX_PROGRAM_ID,
  RESERVES,
  VAULT_CATALOGUE_APYS,
  VANNA_PROGRAM_ID,
} from "./tokens";

export type SolanaPositions = {
  lend: LendPos[];
  perps: PerpPos[];
  phoenixIdle: number;
  /** Phoenix collateral plus unsettled balance, USD; null when the trader account could not be read. */
  phoenixCash: number | null;
  farm: FarmPos[];
};

const today = () => new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
const u128At = (d: Buffer, o: number): bigint => d.readBigUInt64LE(o) + (d.readBigUInt64LE(o + 8) << 64n);

// # Ported from: apps/solana/lib/solana/lend.ts:fetchLenderPositions
export async function fetchLenderPositions(owner: string): Promise<LendPos[]> {
  const syms = Object.keys(RESERVES);
  const keys: string[] = [];
  const meta: { sym: string; decimals: number }[] = [];

  for (const sym of syms) {
    const r = RESERVES[sym];
    const shareMint = findPda(["share_mint", decode58(r.mint)], VANNA_PROGRAM_ID);
    const shareAta = findAta(owner, shareMint, TOKEN_PROGRAM_ID);
    keys.push(shareAta, shareMint, r.reserve);
    meta.push({ sym, decimals: r.decimals });
  }

  const res = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [keys, { encoding: "base64", ...READ_AT }]);
  const accounts = res.value;

  const out: LendPos[] = [];
  for (let i = 0; i < syms.length; i++) {
    const { sym, decimals } = meta[i];
    const ataAcc = accounts[i * 3];
    const mintAcc = accounts[i * 3 + 1];
    const resAcc = accounts[i * 3 + 2];

    if (!ataAcc || !mintAcc || !resAcc) continue;

    const ataBuf = Buffer.from(ataAcc.data[0], "base64");
    if (ataBuf.length < 72) continue;
    const sharesRaw = ataBuf.readBigUInt64LE(64);
    if (sharesRaw === 0n) continue;

    const mintBuf = Buffer.from(mintAcc.data[0], "base64");
    if (mintBuf.length < 45) continue;
    const shareSupply = mintBuf.readBigUInt64LE(36);
    if (shareSupply === 0n) continue;

    const resBuf = Buffer.from(resAcc.data[0], "base64");
    if (resBuf.length < 208) continue;
    const accounted = resBuf.readBigUInt64LE(152);
    const borrows = resBuf.readBigUInt64LE(160);
    const fees = resBuf.readBigUInt64LE(200);
    const lenderAssets = accounted + borrows - fees;

    const assetsRaw = shareSupply > 0n ? (sharesRaw * lenderAssets) / shareSupply : 0n;
    const amt = Number(assetsRaw) / 10 ** decimals;
    const shares = Number(sharesRaw) / 10 ** decimals;

    out.push({
      sym,
      amt,
      shares,
      sharesRaw: sharesRaw.toString(),
      earned: 0,
      since: today(),
    });
  }

  return out;
}

// # Ported from: apps/solana/lib/solana/phoenix-state.ts:decodeTrader
// Phoenix is cross-margined: one trader account holds the phUSD collateral (6 decimals, 1:1 USD) for every position, so a
// position has no collateral of its own. Read from the trader account: collateral, and per position its size (base lots)
// and entry (virtual quote lots = entry notional). The collateral is split across the open positions by entry notional, and
// each position's leverage is all open entry notional / collateral (the account's leverage at entry). P&L % = P&L / that
// share of the collateral. A position entry with zero size but a quote balance is unsettled profit or loss: it counts as cash.
// cashUsd: collateral plus that unsettled balance (what the venue holds besides open positions).
export async function fetchPhoenixPositions(marginPda: string): Promise<{ perps: PerpPos[]; idleUsd: number; cashUsd: number }> {
  const traderPda = findPda(["trader", decode58(marginPda), Uint8Array.of(0, 0)], PHOENIX_PROGRAM_ID);
  const acc = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [traderPda, { encoding: "base64", ...READ_AT }]);

  if (!acc?.value) return { perps: [], idleUsd: 0, cashUsd: 0 };
  const buf = Buffer.from(acc.value.data[0], "base64");
  if (buf.length < 240) return { perps: [], idleUsd: 0, cashUsd: 0 };

  let cashUsd = Number(buf.readBigInt64LE(88)) / 1e6;
  const len = Number(buf.readBigUInt64LE(224));
  const EXTENSION_KEY = 0xff000000n;

  const open: { sym: string; side: "long" | "short"; qty: number; notional: number; assetId: number; baseLots: bigint; snapshot: bigint }[] = [];
  for (let j = 0; j < len; j++) {
    const at = 240 + 40 * j;
    if (buf.length < at + 40) break;
    const entryKey = buf.readBigUInt64LE(at);
    if (entryKey >= EXTENSION_KEY) continue;
    const assetId = Number(entryKey & 0xffffffffn);
    const baseLots = buf.readBigInt64LE(at + 8);
    const virtualQuoteLots = buf.readBigInt64LE(at + 16);

    if (baseLots === 0n && virtualQuoteLots === 0n) continue;
    if (baseLots === 0n) {
      cashUsd += Number(virtualQuoteLots) / 1e6;
      continue;
    }
    const mkt = PHOENIX_MARKETS[assetId];
    if (!mkt) continue;
    open.push({
      sym: mkt.sym,
      side: baseLots > 0n ? "long" : "short",
      qty: Math.abs(Number(baseLots)) / 10 ** mkt.lotDecimals,
      notional: Math.abs(Number(virtualQuoteLots)) / 1e6,
      assetId,
      baseLots,
      snapshot: buf.readBigInt64LE(at + 24),
    });
  }

  if (!open.length) return { perps: [], idleUsd: Math.max(0, cashUsd), cashUsd };
  const total = open.reduce((t, o) => t + o.notional, 0);
  const cash = Math.max(0, cashUsd);
  const lev = cash > 0 ? total / cash : 0;
  // funding to date, as the website's position row; left out (the estimate shows) when it cannot be read
  const funding = await import("./actions").then((m) => m.phoenixFundingUsd(open.map((o) => ({ assetId: o.assetId, baseLots: o.baseLots, snapshot: o.snapshot })))).catch(() => new Map<number, number>());
  const perps: PerpPos[] = open.map((o) => ({
    id: `p-${o.sym.toLowerCase()}`,
    k: o.sym,
    side: o.side,
    lev: Number(lev.toFixed(2)),
    coll: total > 0 ? (cash * o.notional) / total : 0,
    entry: o.qty > 0 ? o.notional / o.qty : 0,
    qty: o.qty,
    pool: cash,
    fundingUsd: funding.get(o.assetId),
    t: today(),
  }));
  // the whole collateral is assigned to the open positions, so none of it is idle
  return { perps, idleUsd: 0, cashUsd };
}

// A Kamino reserve's exchange rate, read on the fork now (web lib/solana/kamino.ts readReserveRate, same fields as below):
// receipts = underlying x collateralSupply / totalLiquidity (rounded down), shown at the receipt mint's decimals.
export type KaminoRate = { totalLiquidity: bigint; collateralSupply: bigint; liquidityDecimals: number; receiptDecimals: number; symbol: string };
export async function fetchKaminoRate(sym: string): Promise<KaminoRate | null> {
  const r = KAMINO_RECEIPTS.find((x) => x.underlying === sym);
  if (!r) return null;
  const res = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [r.reserve, { encoding: "base64", ...READ_AT }]).catch(() => null);
  if (!res?.value) return null;
  const b = Buffer.from(res.value.data[0], "base64");
  if (b.length < 2600) return null;
  const totalSf = (b.readBigUInt64LE(224) << 60n) + u128At(b, 232) - u128At(b, 344) - u128At(b, 360) - u128At(b, 376);
  const totalLiquidity = totalSf >> 60n, collateralSupply = b.readBigUInt64LE(2592);
  if (totalLiquidity <= 0n || collateralSupply <= 0n) return null;
  return { totalLiquidity, collateralSupply, liquidityDecimals: Number(b.readBigUInt64LE(272)), receiptDecimals: r.decimals, symbol: r.symbol };
}

// # Ported from: apps/solana/lib/solana/kamino.ts:readReserveRate
export async function fetchKaminoPositions(marginPda: string): Promise<FarmPos[]> {
  const keys: string[] = [];
  for (const r of KAMINO_RECEIPTS) {
    const ata = findAta(marginPda, r.collateralMint, TOKEN_PROGRAM_ID);
    keys.push(ata, r.reserve);
  }

  const res = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [keys, { encoding: "base64", ...READ_AT }]).catch(() => null);
  if (!res?.value) return [];
  const accounts = res.value;

  const out: FarmPos[] = [];
  for (let i = 0; i < KAMINO_RECEIPTS.length; i++) {
    const r = KAMINO_RECEIPTS[i];
    const ataAcc = accounts[i * 2];
    const resAcc = accounts[i * 2 + 1];

    if (!ataAcc || !resAcc) continue;

    const ataBuf = Buffer.from(ataAcc.data[0], "base64");
    if (ataBuf.length < 72) continue;
    const receiptsRaw = ataBuf.readBigUInt64LE(64);
    if (receiptsRaw === 0n) continue;

    const resBuf = Buffer.from(resAcc.data[0], "base64");
    if (resBuf.length < 2600) continue;

    const avail = resBuf.readBigUInt64LE(224);
    const borrowedSf = u128At(resBuf, 232);
    const decimals = Number(resBuf.readBigUInt64LE(272));
    const protoFeesSf = u128At(resBuf, 344);
    const refFeesSf = u128At(resBuf, 360);
    const pendRefFeesSf = u128At(resBuf, 376);
    const collateralSupply = resBuf.readBigUInt64LE(2592);

    const totalSf = (avail << 60n) + borrowedSf - protoFeesSf - refFeesSf - pendRefFeesSf;
    const totalLiquidity = totalSf >> 60n;

    const underlyingRaw = collateralSupply > 0n ? (receiptsRaw * totalLiquidity) / collateralSupply : 0n;
    const amt = Number(underlyingRaw) / 10 ** decimals;
    const id = `kamino-${r.underlying.toLowerCase()}`;
    const apy = VAULT_CATALOGUE_APYS[id] ?? 0;

    out.push({
      id,
      venue: "Kamino",
      name: `${r.underlying} Lending`,
      sym: r.underlying,
      icon: r.underlying,
      amt,
      apy,
      earned: 0,
      since: today(),
      receiptsRaw: receiptsRaw.toString(),
    });
  }

  return out;
}

// # Ported from: apps/solana/lib/solana/perena.ts:fetchPerenaPositions
export async function fetchVaultPositions(marginPda: string): Promise<FarmPos[]> {
  const perenaKeys: string[] = [];
  for (const v of PERENA_VAULTS) {
    const ata = findAta(marginPda, v.mint, TOKEN_PROGRAM_ID);
    perenaKeys.push(ata, v.account);
  }

  const res = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [perenaKeys, { encoding: "base64", ...READ_AT }]).catch(() => null);
  if (!res?.value) return [];
  const accounts = res.value;

  const out: FarmPos[] = [];

  // Decode Perena vaults
  for (let i = 0; i < PERENA_VAULTS.length; i++) {
    const v = PERENA_VAULTS[i];
    const ataAcc = accounts[i * 2];
    const priceAcc = accounts[i * 2 + 1];

    if (!ataAcc || !priceAcc) continue;

    const ataBuf = Buffer.from(ataAcc.data[0], "base64");
    if (ataBuf.length < 72) continue;
    const sharesRaw = ataBuf.readBigUInt64LE(64);
    if (sharesRaw === 0n) continue;

    const priceBuf = Buffer.from(priceAcc.data[0], "base64");
    if (priceBuf.length < v.priceOffset + 8) continue;
    const priceRaw = priceBuf.readBigUInt64LE(v.priceOffset);
    const priceUsd = Number(priceRaw) / 1e6;

    const sharesUi = Number(sharesRaw) / 10 ** v.decimals;
    const amt = sharesUi * priceUsd;
    const apy = VAULT_CATALOGUE_APYS[v.id] ?? 0;

    out.push({
      id: v.id,
      venue: "Perena",
      name: v.name,
      sym: "USDC",
      icon: v.icon,
      amt,
      apy,
      earned: 0,
      since: today(),
      receiptsRaw: sharesRaw.toString(),
    });
  }

  return out;
}

// # Ported from: apps/solana/lib/solana/lend.ts, phoenix-state.ts, kamino.ts, perena.ts:fetchSolanaPositions
export async function fetchSolanaPositions(owner: string, marginPda: string | null): Promise<SolanaPositions> {
  const lendPromise = fetchLenderPositions(owner).catch((e) => {
    console.warn("[positions] lender read failed:", e);
    return [];
  });

  if (!marginPda) {
    const lend = await lendPromise;
    return {
      lend,
      perps: [],
      phoenixIdle: 0,
      phoenixCash: 0,
      farm: [],
    };
  }

  const [lend, phoenix, kamino, vaults] = await Promise.all([
    lendPromise,
    fetchPhoenixPositions(marginPda).catch((e) => {
      console.warn("[positions] phoenix read failed:", e);
      return { perps: [], idleUsd: 0, cashUsd: null };
    }),
    fetchKaminoPositions(marginPda).catch((e) => {
      console.warn("[positions] kamino read failed:", e);
      return [];
    }),
    fetchVaultPositions(marginPda).catch((e) => {
      console.warn("[positions] vaults read failed:", e);
      return [];
    }),
  ]);

  return {
    lend,
    perps: phoenix.perps,
    phoenixIdle: phoenix.idleUsd,
    phoenixCash: phoenix.cashUsd,
    farm: [...kamino, ...vaults],
  };
}
