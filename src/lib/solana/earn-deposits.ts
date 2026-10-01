import { type Connection, PublicKey } from "@solana/web3.js";

import { type AssetSymbol, assets } from "./assets";
import { VANNA_PROGRAM_ID } from "./config";
import { ApiError } from "./request-json";

export type ShareBalance = { symbol: AssetSymbol; shares: bigint; decimals: number };

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const TOKEN_ACCOUNT_AMOUNT_OFFSET = 64;
const TOKEN_ACCOUNT_MIN_SIZE = 72;

const encoder = new TextEncoder();
const programId = new PublicKey(VANNA_PROGRAM_ID);

function shareAccountFor(owner: PublicKey, underlyingMint: string) {
  const [shareMint] = PublicKey.findProgramAddressSync([encoder.encode("share_mint"), new PublicKey(underlyingMint).toBytes()], programId);
  return PublicKey.findProgramAddressSync([owner.toBytes(), TOKEN_PROGRAM.toBytes(), shareMint.toBytes()], ASSOCIATED_TOKEN_PROGRAM)[0];
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
