import { type Connection, PublicKey } from "@solana/web3.js";

import { type AssetSymbol, assets } from "./assets";
import { assetConfigAddress, reserveAddress, shareMintAddress } from "./program-accounts";
import { ApiError } from "./request-json";

const RESERVE_DISCRIMINATOR = [43, 242, 204, 202, 26, 247, 59, 127];
const ASSET_CONFIG_DISCRIMINATOR = [57, 112, 247, 166, 247, 64, 140, 23];
const RESERVE_SIZE = 228;
const ASSET_CONFIG_SIZE = 161;
const MINT_SUPPLY_OFFSET = 36;
const MINT_MIN_SIZE = 44;

const SUPPLY_CAP_OFFSET = 136;
const BORROW_CAP_OFFSET = 144;
const LIQUIDITY_OFFSET = 152;
const BORROWED_OFFSET = 160;
const ACCRUED_FEES_OFFSET = 200;
const RATE_OFFSET = 216;

const MAX_COLLATERAL_OFFSET = 136;
const LTV_OFFSET = 144;
const LIQUIDATION_THRESHOLD_OFFSET = 146;
const LIQUIDATION_BONUS_OFFSET = 148;
const MAX_CONFIDENCE_OFFSET = 150;
const MAX_PRICE_AGE_OFFSET = 152;
const COLLATERAL_ENABLED_OFFSET = 159;
const BORROW_ENABLED_OFFSET = 160;

export type VaultReserve = {
  supplyCap: bigint;
  borrowCap: bigint;
  accountedLiquidity: bigint;
  totalBorrowAssets: bigint;
  accruedFees: bigint;
  baseRateBps: number;
  slope1Bps: number;
  slope2Bps: number;
  optimalBps: number;
  reserveFactorBps: number;
};

export type AssetLimits = {
  maxCollateralPerMargin: bigint;
  ltvBps: number;
  liquidationThresholdBps: number;
  liquidationBonusBps: number;
  maxConfidenceBps: number;
  maxPriceAgeSeconds: number;
  collateralEnabled: boolean;
  borrowEnabled: boolean;
};

export type VaultAccounts = {
  reserve: VaultReserve;
  limits: AssetLimits;
  // Total supply of the vault's share token.
  shareSupply: bigint;
};

const hasDiscriminator = (data: Uint8Array, discriminator: readonly number[]) => discriminator.every((byte, index) => data[index] === byte);
const viewOf = (data: Uint8Array) => new DataView(data.buffer, data.byteOffset, data.byteLength);

export function decodeVaultReserve(data: Uint8Array): VaultReserve {
  if (data.byteLength < RESERVE_SIZE || !hasDiscriminator(data, RESERVE_DISCRIMINATOR)) throw new Error("Not a lending reserve");
  const view = viewOf(data);
  const rate = (index: number) => view.getUint16(RATE_OFFSET + index * 2, true);
  return {
    supplyCap: view.getBigUint64(SUPPLY_CAP_OFFSET, true),
    borrowCap: view.getBigUint64(BORROW_CAP_OFFSET, true),
    accountedLiquidity: view.getBigUint64(LIQUIDITY_OFFSET, true),
    totalBorrowAssets: view.getBigUint64(BORROWED_OFFSET, true),
    accruedFees: view.getBigUint64(ACCRUED_FEES_OFFSET, true),
    baseRateBps: rate(0),
    slope1Bps: rate(1),
    slope2Bps: rate(2),
    optimalBps: rate(3),
    reserveFactorBps: rate(4),
  };
}

export function decodeAssetLimits(data: Uint8Array): AssetLimits {
  if (data.byteLength < ASSET_CONFIG_SIZE || !hasDiscriminator(data, ASSET_CONFIG_DISCRIMINATOR)) throw new Error("Not an asset config");
  const view = viewOf(data);
  return {
    maxCollateralPerMargin: view.getBigUint64(MAX_COLLATERAL_OFFSET, true),
    ltvBps: view.getUint16(LTV_OFFSET, true),
    liquidationThresholdBps: view.getUint16(LIQUIDATION_THRESHOLD_OFFSET, true),
    liquidationBonusBps: view.getUint16(LIQUIDATION_BONUS_OFFSET, true),
    maxConfidenceBps: view.getUint16(MAX_CONFIDENCE_OFFSET, true),
    maxPriceAgeSeconds: view.getUint32(MAX_PRICE_AGE_OFFSET, true),
    collateralEnabled: data[COLLATERAL_ENABLED_OFFSET] === 1,
    borrowEnabled: data[BORROW_ENABLED_OFFSET] === 1,
  };
}

export function decodeShareSupply(data: Uint8Array): bigint {
  if (data.byteLength < MINT_MIN_SIZE) throw new Error("Not a token mint");
  return viewOf(data).getBigUint64(MINT_SUPPLY_OFFSET, true);
}

// Every vault's reserve, asset configuration and share token in one read. A vault whose accounts are missing is left out.
export async function fetchVaultAccounts(connection: Connection): Promise<Partial<Record<AssetSymbol, VaultAccounts>>> {
  const keys = assets.flatMap((asset) => {
    const mint = new PublicKey(asset.mint);
    return [reserveAddress(mint), assetConfigAddress(mint), shareMintAddress(mint)];
  });
  const infos = await connection.getMultipleAccountsInfo(keys, "confirmed").catch(() => {
    throw new ApiError("network");
  });

  const accounts: Partial<Record<AssetSymbol, VaultAccounts>> = {};
  assets.forEach((asset, index) => {
    const [reserve, config, share] = infos.slice(index * 3, index * 3 + 3);
    if (!reserve || !config || !share) return;
    accounts[asset.symbol] = { reserve: decodeVaultReserve(reserve.data), limits: decodeAssetLimits(config.data), shareSupply: decodeShareSupply(share.data) };
  });
  return accounts;
}
