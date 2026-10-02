import { type Connection, PublicKey } from "@solana/web3.js";

import { type AssetSymbol, assets } from "./assets";
import { ApiError } from "./request-json";
import { usdToUnits } from "./usd";

const PYTH_RECEIVER_PROGRAM = "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ";
const PYTH_PUSH_ORACLE_PROGRAM = new PublicKey("pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT");

const DISCRIMINATOR = [0x22, 0xf1, 0x23, 0x63, 0x9d, 0x7e, 0xf4, 0xcd];
const FEED_ID_OFFSET = 41;
const PRICE_OFFSET = 73;
const EXPONENT_OFFSET = 89;
const MIN_ACCOUNT_SIZE = 101;

export type OraclePrices = Partial<Record<AssetSymbol, bigint>>;

function hexBytes(hex: string) {
  return Uint8Array.from({ length: 32 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16));
}

export function priceAccountAddress(asset: { pythFeedId: string }): PublicKey {
  return feedAddress(asset.pythFeedId);
}

function feedAddress(feedId: string) {
  return PublicKey.findProgramAddressSync([Uint8Array.of(0, 0), hexBytes(feedId)], PYTH_PUSH_ORACLE_PROGRAM)[0];
}

export function decodePriceUpdate(data: Uint8Array, feedId: string): number | null {
  if (data.byteLength < MIN_ACCOUNT_SIZE) return null;
  if (DISCRIMINATOR.some((byte, index) => data[index] !== byte)) return null;
  const actualFeed = Array.from(data.slice(FEED_ID_OFFSET, FEED_ID_OFFSET + 32), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actualFeed !== feedId) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const price = Number(view.getBigInt64(PRICE_OFFSET, true)) * 10 ** view.getInt32(EXPONENT_OFFSET, true);
  return Number.isFinite(price) && price > 0 ? price : null;
}

// Read-only. The web app also writes missing fork prices with a cheatcode; the phone never does,
// and a feed it cannot read is left out so the caller can show that value as unavailable.
// Publish times are not checked: the fork's clock runs ahead of the device's.
export async function fetchOraclePrices(connection: Connection): Promise<OraclePrices> {
  const accounts = await connection
    .getMultipleAccountsInfo(assets.map((asset) => feedAddress(asset.pythFeedId)))
    .catch(() => {
      throw new ApiError("network");
    });

  const prices: OraclePrices = {};
  assets.forEach((asset, index) => {
    const account = accounts[index];
    if (!account || account.owner.toBase58() !== PYTH_RECEIVER_PROGRAM) return;
    const price = decodePriceUpdate(account.data, asset.pythFeedId);
    if (price !== null) prices[asset.symbol] = usdToUnits(price);
  });
  return prices;
}
