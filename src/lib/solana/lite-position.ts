import { type Connection, PublicKey } from "@solana/web3.js";

import { litePositionAddress } from "./program-accounts";

const LITE_POSITION_DISCRIMINATOR = [141, 145, 27, 4, 142, 122, 126, 174];
const STRATEGY_OFFSET = 40;
const MINT_OFFSET = 72;
const RECEIPTS_OFFSET = 104;
const DEPOSITED_OFFSET = 112;
const EQUITY_OFFSET = 120;
const RESERVED_OFFSET = 129;
const RESERVED_SIZE = 64;
const SCHEMA_FLAG = 16;
const LEGACY_DEBT_FLAG = 17;
const KEY = 32;

export type LitePosition = {
  address: PublicKey;
  strategy: PublicKey;
  mint: PublicKey;
  // Kamino receipt tokens the margin account holds for this position.
  receipts: bigint;
  deposited: bigint;
  equity: bigint;
  // Debt shares the supply attributed to this position; null for positions opened before attribution existed.
  trackedShares: bigint | null;
  legacyDebtFlag: boolean;
};

const keyAt = (data: Uint8Array, offset: number) => new PublicKey(data.subarray(offset, offset + KEY));

export function decodeLitePosition(address: PublicKey, data: Uint8Array): LitePosition {
  if (data.byteLength < RESERVED_OFFSET + RESERVED_SIZE || !LITE_POSITION_DISCRIMINATOR.every((byte, index) => data[index] === byte)) {
    throw new Error("Not a Kamino position");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const attributed = data[RESERVED_OFFSET + SCHEMA_FLAG] === 1;
  return {
    address,
    strategy: keyAt(data, STRATEGY_OFFSET),
    mint: keyAt(data, MINT_OFFSET),
    receipts: view.getBigUint64(RECEIPTS_OFFSET, true),
    deposited: view.getBigUint64(DEPOSITED_OFFSET, true),
    equity: view.getBigUint64(EQUITY_OFFSET, true),
    trackedShares: attributed ? view.getBigUint64(RESERVED_OFFSET, true) + (view.getBigUint64(RESERVED_OFFSET + 8, true) << 64n) : null,
    legacyDebtFlag: data[RESERVED_OFFSET + LEGACY_DEBT_FLAG] === 1,
  };
}

// Every Kamino position the margin account holds: the unindexed first one, then one per registered asset index.
export async function fetchLitePositions(connection: Connection, margin: PublicKey, registered: readonly number[]): Promise<LitePosition[]> {
  const addresses = [litePositionAddress(margin), ...registered.map((index) => litePositionAddress(margin, index))];
  const infos = await connection.getMultipleAccountsInfo(addresses, "confirmed");
  return infos.flatMap((info, index) => (info === null ? [] : [decodeLitePosition(addresses[index], info.data)]));
}

// The first Kamino position on a margin account lives at an address with no index; later ones are keyed by the asset's
// index. An asset that already has a position keeps it, so a second deposit adds to the same account.
export async function resolveLitePosition(connection: Connection, margin: PublicKey, mint: PublicKey, assetIndex: number, registered: readonly number[]): Promise<PublicKey> {
  const legacy = litePositionAddress(margin);
  const info = await connection.getAccountInfo(legacy, "confirmed");
  const existing = info === null ? null : decodeLitePosition(legacy, info.data);
  const indexed = registered.includes(assetIndex);
  if (existing?.mint.equals(mint)) {
    if (indexed) throw new Error("This pool already has a Kamino position");
    return legacy;
  }
  return existing === null && !indexed ? legacy : litePositionAddress(margin, assetIndex);
}
