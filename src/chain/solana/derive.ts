// Solana PDA and ATA derivation without @solana/web3.js.
// # Ported from: apps/solana/lib/solana/pdas.ts

import { sha256 } from "@noble/hashes/sha256";
import { decode58, findPda } from "./pda";
import { base58 } from "./prices";

export { decode58, findPda };

export const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

// # Ported from: apps/solana/lib/solana/pdas.ts:walletAta
export function findAta(owner: string, mint: string, tokenProgram = TOKEN_PROGRAM_ID): string {
  return findPda([decode58(owner), decode58(tokenProgram), decode58(mint)], ASSOCIATED_TOKEN_PROGRAM_ID);
}

// # Ported from: apps/solana/lib/solana/pdas.ts:createWithSeed
export function createWithSeed(base: string, seed: string, programId: string): string {
  const buf = Buffer.concat([decode58(base), Buffer.from(seed, "utf8"), decode58(programId)]);
  return base58(sha256(buf));
}
