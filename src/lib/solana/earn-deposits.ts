import { type Connection, PublicKey } from "@solana/web3.js";

import { type AssetSymbol, assets } from "./assets";
import { associatedTokenAddress, shareMintAddress, TOKEN_PROGRAM } from "./program-accounts";
import { ApiError } from "./request-json";

export type ShareBalance = { symbol: AssetSymbol; shares: bigint; decimals: number };

const TOKEN_ACCOUNT_AMOUNT_OFFSET = 64;
const TOKEN_ACCOUNT_MIN_SIZE = 72;

function shareAccountFor(owner: PublicKey, underlyingMint: string) {
  return associatedTokenAddress(owner, shareMintAddress(new PublicKey(underlyingMint)), TOKEN_PROGRAM);
}

export function readTokenAmount(data: Uint8Array): bigint {
  if (data.byteLength < TOKEN_ACCOUNT_MIN_SIZE) throw new ApiError("invalid-response");
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(TOKEN_ACCOUNT_AMOUNT_OFFSET, true);
}

// A missing account means no deposit; a failed read must throw so a deposit never shows as zero.
export async function fetchShareBalances(connection: Connection, owner: string): Promise<ShareBalance[]> {
  const ownerKey = new PublicKey(owner);
  const infos = await connection
    .getMultipleAccountsInfo(assets.map((asset) => shareAccountFor(ownerKey, asset.mint)))
    .catch(() => {
      throw new ApiError("network");
    });

  return assets.flatMap((asset, index) => {
    const info = infos[index];
    if (!info || !info.owner.equals(TOKEN_PROGRAM)) return [];
    const shares = readTokenAmount(info.data);
    return shares > 0n ? [{ symbol: asset.symbol, shares, decimals: asset.decimals }] : [];
  });
}
