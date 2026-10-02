import { PublicKey } from "@solana/web3.js";

import type { AssetInfo } from "./assets";
import { VANNA_PROGRAM_ID } from "./config";

export const SYSTEM_PROGRAM = new PublicKey("11111111111111111111111111111111");
export const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const TOKEN_2022_PROGRAM = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const ASSOCIATED_TOKEN_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const VANNA_PROGRAM = new PublicKey(VANNA_PROGRAM_ID);

const encoder = new TextEncoder();

function derive(seed: string, key?: PublicKey): PublicKey {
  const seeds = key === undefined ? [encoder.encode(seed)] : [encoder.encode(seed), key.toBytes()];
  return PublicKey.findProgramAddressSync(seeds, VANNA_PROGRAM)[0];
}

export const protocolConfigAddress = () => derive("protocol");
export const assetConfigAddress = (mint: PublicKey) => derive("asset", mint);
export const reserveAddress = (mint: PublicKey) => derive("reserve", mint);
export const shareMintAddress = (mint: PublicKey) => derive("share_mint", mint);
export const marginAddress = (authority: PublicKey) => derive("margin", authority);

export const tokenProgramOf = (asset: AssetInfo) => (asset.token2022 ? TOKEN_2022_PROGRAM : TOKEN_PROGRAM);

export function associatedTokenAddress(owner: PublicKey, mint: PublicKey, tokenProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([owner.toBytes(), tokenProgram.toBytes(), mint.toBytes()], ASSOCIATED_TOKEN_PROGRAM)[0];
}
