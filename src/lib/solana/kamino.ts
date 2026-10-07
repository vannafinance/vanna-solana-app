import { type Connection, PublicKey } from "@solana/web3.js";

import type { AssetSymbol } from "./assets";

export type YieldSymbol = "USDC" | "SOL";

export type KaminoReserveAddresses = {
  reserve: PublicKey;
  liquidityVault: PublicKey;
  collateralMint: PublicKey;
};

export const KAMINO_PROGRAM = new PublicKey("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");
export const KAMINO_MAIN_MARKET = new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF");
export const KAMINO_MARKET_AUTHORITY = new PublicKey("9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo");
// A lookup table that exists on mainnet and holds the accounts every Kamino transaction names (its program, the main market and its
// authority, the token program, the instructions sysvar). Wallets read mainnet, so unlike a table made on the fork they can read it.
export const KAMINO_LOOKUP_TABLE = new PublicKey("3hi1c3L11vL446LJotFZNXHp1YZSLQ867SeQJUc9b5t1");
// Vanna's own mainnet table (scripts/create-vanna-lookup-table.cjs): the program and, for every asset, its mint, asset
// config, reserve and price feed. Every margin transaction lists those for its health check, so naming them by a one-byte
// index keeps a heavy account's orders inside one transaction without a table made on the fork, which strict wallets
// (Solflare) refuse. The fork copies it from mainnet.
export const VANNA_LOOKUP_TABLE = new PublicKey("Cf1aqtYwBr8A9BfL5Hi2WyeWYrBCU4nkbEH5uhpK2SdA");
// More mainnet tables that Kamino and Jupiter transactions use often. A Perps order on an account with Farm positions needs
// every byte they save, and a wallet reads them like any other account.
export const KAMINO_EXTRA_LOOKUP_TABLES = [
  new PublicKey("7i8VciRdgphzakobo5E6nsNsHZtqDVXRDE6k1iQqvLq"),
  new PublicKey("AKgVyHByNHG4nZUjyHQaCszQd5oXDudVUcevsKLx3ehT"),
  new PublicKey("Fh5MLAFZKoQLeBkzkpjZVEmyLAeSeGGHKMfP3bi27pTi"),
  new PublicKey("6uhwng7MtdwBxzQHP7THRYuwq4E7Fz9nW9tNgngZNPBk"),
] as const;
export const INSTRUCTIONS_SYSVAR = new PublicKey("Sysvar1nstructions1111111111111111111111111");

const MAIN_MARKET_RESERVES: Record<YieldSymbol, KaminoReserveAddresses> = {
  USDC: {
    reserve: new PublicKey("D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59"),
    liquidityVault: new PublicKey("Bgq7trRgVMeq33yt235zM2onQ4bRDBsY5EWiTetF4qw6"),
    collateralMint: new PublicKey("B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D"),
  },
  SOL: {
    reserve: new PublicKey("d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q"),
    liquidityVault: new PublicKey("GafNuUXj9rxGLn4y79dPu6MHSuPWeJR6UtTWuexpGh3U"),
    collateralMint: new PublicKey("2UywZrUdyqs5vDchy7fKQJKau2RVyuzBev2XKGPDSiX1"),
  },
};

export const YIELD_SYMBOLS = Object.keys(MAIN_MARKET_RESERVES) as readonly YieldSymbol[];

export function isYieldSymbol(symbol: AssetSymbol): symbol is YieldSymbol {
  return symbol in MAIN_MARKET_RESERVES;
}

export const kaminoReserveOf = (symbol: YieldSymbol) => MAIN_MARKET_RESERVES[symbol];

// The klend reserve is a zero-copy account; every field below is read at its byte offset, and the amounts are fixed
// point with 60 fractional bits.
const RESERVE_DISCRIMINATOR = [43, 242, 204, 202, 26, 247, 59, 127];
const MINT_OFFSET = 128;
const AVAILABLE_OFFSET = 224;
const BORROWED_OFFSET = 232;
const PROTOCOL_FEES_OFFSET = 344;
const REFERRER_FEES_OFFSET = 360;
const PENDING_FEES_OFFSET = 376;
const TAKE_RATE_OFFSET = 4870;
const CURVE_OFFSET = 4920;
const CURVE_POINTS = 11;
const CURVE_STRIDE = 8;
const RECEIPT_MINT_OFFSET = 2560;
const RECEIPT_SUPPLY_OFFSET = 2592;
const RESERVE_MIN_SIZE = CURVE_OFFSET + CURVE_POINTS * CURVE_STRIDE;
const MAX_CURVE_RATE_BPS = 200_000;
const FRACTION_BITS = 60n;
const BPS = 10_000;

export type KaminoReserveStats = {
  available: bigint;
  totalSupplied: bigint;
  utilizationBps: number;
  borrowApyBps: number;
  supplyApyBps: number;
};

function hasReserveDiscriminator(data: Uint8Array) {
  return RESERVE_DISCRIMINATOR.every((byte, index) => data[index] === byte);
}

const viewOf = (data: Uint8Array) => new DataView(data.buffer, data.byteOffset, data.byteLength);

function u128At(view: DataView, offset: number) {
  return view.getBigUint64(offset, true) + (view.getBigUint64(offset + 8, true) << 64n);
}

// A layout that does not look like a real rate curve returns null: showing no figure beats showing a wrong one.
export function decodeKaminoReserveStats(data: Uint8Array): KaminoReserveStats | null {
  if (data.byteLength < RESERVE_MIN_SIZE || !hasReserveDiscriminator(data)) return null;
  const view = viewOf(data);

  const available = view.getBigUint64(AVAILABLE_OFFSET, true);
  const borrowed = u128At(view, BORROWED_OFFSET) >> FRACTION_BITS;
  const totalSupplied = available + borrowed;
  const utilizationBps = totalSupplied === 0n ? 0 : Number((borrowed * BigInt(BPS)) / totalSupplied);

  const curve = Array.from({ length: CURVE_POINTS }, (_, index) => {
    const offset = CURVE_OFFSET + index * CURVE_STRIDE;
    return { utilization: view.getUint32(offset, true), rate: view.getUint32(offset + 4, true) };
  });
  const sane = curve.every((point, index) => point.utilization <= BPS && point.rate <= MAX_CURVE_RATE_BPS && (index === 0 || point.utilization >= curve[index - 1].utilization));
  const takeRate = data[TAKE_RATE_OFFSET];
  if (!sane || takeRate > 100) return null;

  let borrowApyBps = curve[0].rate;
  for (let index = 0; index < curve.length - 1; index++) {
    const from = curve[index];
    const to = curve[index + 1];
    if (utilizationBps < from.utilization || utilizationBps > to.utilization) continue;
    const span = to.utilization - from.utilization;
    borrowApyBps = span === 0 ? from.rate : from.rate + ((utilizationBps - from.utilization) * (to.rate - from.rate)) / span;
    break;
  }
  const supplyApyBps = (borrowApyBps * utilizationBps * (100 - takeRate)) / BPS / 100;
  return { available, totalSupplied, utilizationBps, borrowApyBps: Math.round(borrowApyBps), supplyApyBps: Math.round(supplyApyBps) };
}

export async function fetchKaminoStats(connection: Connection): Promise<Record<YieldSymbol, KaminoReserveStats | null>> {
  const [usdc, sol] = await connection.getMultipleAccountsInfo([MAIN_MARKET_RESERVES.USDC.reserve, MAIN_MARKET_RESERVES.SOL.reserve], "confirmed");
  return { USDC: usdc ? decodeKaminoReserveStats(usdc.data) : null, SOL: sol ? decodeKaminoReserveStats(sol.data) : null };
}

// What a number of Kamino receipt tokens redeems for, in the reserve's underlying token.
export function kaminoReceiptValue(data: Uint8Array, mint: PublicKey, symbol: YieldSymbol, receipts: bigint): bigint {
  const addresses = MAIN_MARKET_RESERVES[symbol];
  const matchesKey = (offset: number, key: PublicKey) => key.equals(new PublicKey(data.subarray(offset, offset + 32)));
  if (data.byteLength < RECEIPT_SUPPLY_OFFSET + 8 || !hasReserveDiscriminator(data) || !matchesKey(MINT_OFFSET, mint) || !matchesKey(RECEIPT_MINT_OFFSET, addresses.collateralMint)) {
    throw new Error("Invalid Kamino reserve layout");
  }
  const view = viewOf(data);
  const total = (view.getBigUint64(AVAILABLE_OFFSET, true) << FRACTION_BITS) + u128At(view, BORROWED_OFFSET) - u128At(view, PROTOCOL_FEES_OFFSET) - u128At(view, REFERRER_FEES_OFFSET) - u128At(view, PENDING_FEES_OFFSET);
  const supply = view.getBigUint64(RECEIPT_SUPPLY_OFFSET, true);
  if (total < 0n || supply === 0n) throw new Error("Invalid Kamino reserve supply");
  return (receipts * (total >> FRACTION_BITS)) / supply;
}
