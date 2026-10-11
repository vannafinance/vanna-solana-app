import { type AccountMeta, type Connection, PublicKey } from "@solana/web3.js";

import { type AssetInfo, type AssetSymbol, assetByMint, assets } from "./assets";
import { isYieldSymbol, kaminoReserveOf } from "./kamino";
import { decodeLitePosition } from "./lite-position";
import { priceAccountAddress } from "./oracle-prices";
import {
  assetConfigAddress,
  associatedTokenAddress,
  debtPositionAddress,
  litePositionAddress,
  reserveAddress,
  TOKEN_PROGRAM,
  tokenProgramOf,
} from "./program-accounts";
import { MarginAccountMissingError, UnsupportedPositionError } from "./perps-errors";

const MARGIN_DISCRIMINATOR = [133, 220, 173, 213, 179, 211, 43, 238];
const ASSET_CONFIG_DISCRIMINATOR = [57, 112, 247, 166, 247, 64, 140, 23];
const MARGIN_ACCOUNT_SIZE = 244;
const SLOTS = 24;
const EMPTY_INDEX = 0xffff;
const COLLATERAL_OFFSET = 43;
const DEBT_OFFSET = 91;
const RESERVED_OFFSET = 148;
const RESERVED_LENGTH = 96;
const ASSET_INDEX_OFFSET = 156;
const MAX_LITE_POSITIONS = 8;

export type MarginSlots = {
  collateral: number[];
  debt: number[];
  lite: number[];
};

function hasDiscriminator(data: Uint8Array, discriminator: readonly number[]) {
  return discriminator.every((byte, index) => data[index] === byte);
}

export function decodeMarginAccount(data: Uint8Array): MarginSlots {
  if (data.byteLength < MARGIN_ACCOUNT_SIZE || !hasDiscriminator(data, MARGIN_DISCRIMINATOR)) throw new Error("Not a margin account");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const slots = (offset: number) => Array.from({ length: SLOTS }, (_, index) => view.getUint16(offset + index * 2, true));

  const liteCount = data[RESERVED_OFFSET];
  if (liteCount > MAX_LITE_POSITIONS || 1 + liteCount * 2 > RESERVED_LENGTH) throw new Error("Invalid Kamino position registry");
  const lite = Array.from({ length: liteCount }, (_, index) => view.getUint16(RESERVED_OFFSET + 1 + index * 2, true));
  return { collateral: slots(COLLATERAL_OFFSET), debt: slots(DEBT_OFFSET), lite };
}

export function decodeAssetIndex(data: Uint8Array): number {
  if (data.byteLength < ASSET_INDEX_OFFSET + 2 || !hasDiscriminator(data, ASSET_CONFIG_DISCRIMINATOR)) throw new Error("Not an asset config");
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint16(ASSET_INDEX_OFFSET, true);
}

export type MarginState = {
  margin: PublicKey;
  slots: MarginSlots;
  symbolOf: ReadonlyMap<number, AssetInfo>;
};

export async function fetchMarginState(connection: Connection, margin: PublicKey): Promise<MarginState> {
  const [marginInfo, ...configs] = await connection.getMultipleAccountsInfo([margin, ...assets.map((asset) => assetConfigAddress(new PublicKey(asset.mint)))], "confirmed");
  if (marginInfo === null) throw new MarginAccountMissingError();

  const symbolOf = new Map<number, AssetInfo>();
  configs.forEach((info, index) => {
    if (info !== null) symbolOf.set(decodeAssetIndex(info.data), assets[index]);
  });
  return { margin, slots: decodeMarginAccount(marginInfo.data), symbolOf };
}

type ScanOptions = {
  excludeCollateral?: readonly AssetSymbol[];
  excludeDebt?: readonly AssetSymbol[];
  injectDebt?: AssetSymbol;
  injectCollateral?: AssetSymbol;
  excludeLite?: PublicKey;
};

function withInjected(slots: number[], symbol: AssetSymbol | undefined, symbolOf: ReadonlyMap<number, AssetInfo>): number[] {
  if (symbol === undefined) return slots;
  const entry = [...symbolOf.entries()].find(([, asset]) => asset.symbol === symbol);
  if (!entry) throw new Error(`Cannot add ${symbol} to the position scan`);
  if (slots.includes(entry[0])) return slots;
  const empty = slots.indexOf(EMPTY_INDEX);
  if (empty === -1) throw new Error(`No free position slot for ${symbol}`);
  return slots.map((value, index) => (index === empty ? entry[0] : value));
}

const readOnly = (pubkey: PublicKey): AccountMeta => ({ pubkey, isSigner: false, isWritable: false });

// The program's health check reads one block of accounts per active position, in slot order, and rejects anything else
// (error 6024). An asset the instruction already names itself is left out; one that this same transaction opens for the
// first time is added, because it is not in the account yet when this snapshot is read.
// A Kamino position adds five accounts after its own address: its strategy, the asset's config, the receipt token vault,
// the Kamino reserve and the price feed. A position the instruction is itself closing out is left out entirely.
export async function positionAccounts(connection: Connection, state: MarginState, options: ScanOptions = {}): Promise<AccountMeta[]> {
  const { margin, slots, symbolOf } = state;
  const collateral = withInjected(slots.collateral, options.injectCollateral, symbolOf);
  const debt = withInjected(slots.debt, options.injectDebt, symbolOf);
  const metas: AccountMeta[] = [];

  for (const index of collateral) {
    const asset = index === EMPTY_INDEX ? undefined : symbolOf.get(index);
    if (!asset || options.excludeCollateral?.includes(asset.symbol)) continue;
    metas.push(
      readOnly(assetConfigAddress(new PublicKey(asset.mint))),
      readOnly(associatedTokenAddress(margin, new PublicKey(asset.mint), tokenProgramOf(asset))),
      readOnly(priceAccountAddress(asset)),
    );
  }

  for (const index of debt) {
    const asset = index === EMPTY_INDEX ? undefined : symbolOf.get(index);
    if (!asset || options.excludeDebt?.includes(asset.symbol)) continue;
    const reserve = reserveAddress(new PublicKey(asset.mint));
    metas.push(readOnly(assetConfigAddress(new PublicKey(asset.mint))), readOnly(reserve), readOnly(debtPositionAddress(margin, reserve)), readOnly(priceAccountAddress(asset)));
  }

  const liteAddresses = [litePositionAddress(margin), ...slots.lite.map((index) => litePositionAddress(margin, index))];
  const liteInfos = await connection.getMultipleAccountsInfo(liteAddresses, "confirmed");
  liteAddresses.forEach((address, index) => {
    if (options.excludeLite?.equals(address)) return;
    metas.push(readOnly(address));
    const info = liteInfos[index];
    if (info === null) return;
    const position = decodeLitePosition(address, info.data);
    const asset = assetByMint.get(position.mint.toBase58());
    if (!asset || !isYieldSymbol(asset.symbol)) throw new UnsupportedPositionError();
    metas.push(
      readOnly(position.strategy),
      readOnly(assetConfigAddress(position.mint)),
      readOnly(associatedTokenAddress(margin, kaminoReserveOf(asset.symbol).collateralMint, TOKEN_PROGRAM)),
      readOnly(kaminoReserveOf(asset.symbol).reserve),
      readOnly(priceAccountAddress(asset)),
    );
  });
  return metas;
}

export function assetIndexOf(state: MarginState, symbol: AssetSymbol): number {
  const entry = [...state.symbolOf.entries()].find(([, asset]) => asset.symbol === symbol);
  if (!entry) throw new Error(`${symbol} is not registered on this margin account`);
  return entry[0];
}
