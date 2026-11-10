import { Buffer } from "buffer";

import type { FarmPos, LendPos, PerpPos } from "@/sample/data";

import { decode58, findAta, findPda, TOKEN_PROGRAM_ID } from "./derive";
import { rpc } from "./rpc";
import {
  BASIS_VAULTS,
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

  const res = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [keys, { encoding: "base64" }]);
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
      earned: 0,
      since: today(),
    });
  }

  return out;
}

// # Ported from: apps/solana/lib/solana/phoenix-state.ts:decodeTrader
export async function fetchPhoenixPositions(marginPda: string): Promise<{ perps: PerpPos[]; idleUsd: number }> {
  const traderPda = findPda(["trader", decode58(marginPda), Uint8Array.of(0, 0)], PHOENIX_PROGRAM_ID);
  const acc = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [traderPda, { encoding: "base64" }]).catch(() => null);

  if (!acc?.value) return { perps: [], idleUsd: 0 };
  const buf = Buffer.from(acc.value.data[0], "base64");
  if (buf.length < 240) return { perps: [], idleUsd: 0 };

  const collateral = buf.readBigInt64LE(88);
  const idleUsd = Number(collateral) / 1e6;
  const len = Number(buf.readBigUInt64LE(224));
  const EXTENSION_KEY = 0xff000000n;

  const perps: PerpPos[] = [];
  for (let j = 0; j < len; j++) {
    const at = 240 + 40 * j;
    if (buf.length < at + 40) break;
    const entryKey = buf.readBigUInt64LE(at);
    if (entryKey >= EXTENSION_KEY) continue;
    const assetId = Number(entryKey & 0xffffffffn);
    const baseLots = buf.readBigInt64LE(at + 8);
    const virtualQuoteLots = buf.readBigInt64LE(at + 16);

    if (baseLots === 0n && virtualQuoteLots === 0n) continue;
    const mkt = PHOENIX_MARKETS[assetId];
    if (!mkt) continue;

    const sizeTokens = Math.abs(Number(baseLots)) / 10 ** mkt.lotDecimals;
    const entry = sizeTokens > 0 ? Math.abs(Number(virtualQuoteLots) / 1e6) / sizeTokens : 0;
    const notional = Math.abs(Number(virtualQuoteLots) / 1e6);
    const lev = mkt.maxLev ?? 2;
    const coll = lev > 0 ? notional / lev : notional;
    const side = baseLots > 0n ? "long" : "short";

    perps.push({
      id: `p-${mkt.sym.toLowerCase()}`,
      k: mkt.sym,
      side,
      lev,
      coll,
      entry,
      t: today(),
    });
  }

  return { perps, idleUsd };
}

// # Ported from: apps/solana/lib/solana/kamino.ts:readReserveRate
export async function fetchKaminoPositions(marginPda: string): Promise<FarmPos[]> {
  const keys: string[] = [];
  for (const r of KAMINO_RECEIPTS) {
    const ata = findAta(marginPda, r.collateralMint, TOKEN_PROGRAM_ID);
    keys.push(ata, r.reserve);
  }

  const res = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [keys, { encoding: "base64" }]).catch(() => null);
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
      kind: "lend",
      venue: "Kamino",
      name: `${r.underlying} Lending`,
      sym: r.underlying,
      icon: r.underlying,
      amt,
      apy,
      earned: 0,
      since: today(),
    });
  }

  return out;
}

// # Ported from: apps/solana/lib/solana/perena.ts:fetchPerenaPositions & apps/solana/lib/solana/vault-catalogue.ts:VAULTS
export async function fetchVaultPositions(marginPda: string): Promise<FarmPos[]> {
  const perenaKeys: string[] = [];
  for (const v of PERENA_VAULTS) {
    const ata = findAta(marginPda, v.mint, TOKEN_PROGRAM_ID);
    perenaKeys.push(ata, v.account);
  }

  const basisKeys: string[] = [];
  for (const v of BASIS_VAULTS) {
    const ata = findAta(marginPda, v.mint, TOKEN_PROGRAM_ID);
    basisKeys.push(ata);
  }

  const allKeys = [...perenaKeys, ...basisKeys];
  const res = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [allKeys, { encoding: "base64" }]).catch(() => null);
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
      kind: "lend",
      venue: "Perena",
      name: v.name,
      sym: "USDC",
      icon: v.icon,
      amt,
      apy,
      earned: 0,
      since: today(),
    });
  }

  // Decode Basis vaults
  const basisOffset = PERENA_VAULTS.length * 2;
  for (let i = 0; i < BASIS_VAULTS.length; i++) {
    const v = BASIS_VAULTS[i];
    const ataAcc = accounts[basisOffset + i];
    if (!ataAcc) continue;

    const ataBuf = Buffer.from(ataAcc.data[0], "base64");
    if (ataBuf.length < 72) continue;
    const sharesRaw = ataBuf.readBigUInt64LE(64);
    if (sharesRaw === 0n) continue;

    const sharesUi = Number(sharesRaw) / 10 ** v.decimals;
    const apy = VAULT_CATALOGUE_APYS[v.id] ?? 0;

    out.push({
      id: v.id,
      kind: "dn",
      venue: "Jupiter and Phoenix",
      name: v.name,
      sym: "USDC",
      icon: v.asset,
      amt: sharesUi,
      apy,
      earned: 0,
      since: today(),
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
      farm: [],
    };
  }

  const [lend, phoenix, kamino, vaults] = await Promise.all([
    lendPromise,
    fetchPhoenixPositions(marginPda).catch((e) => {
      console.warn("[positions] phoenix read failed:", e);
      return { perps: [], idleUsd: 0 };
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
    farm: [...kamino, ...vaults],
  };
}
