import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";

import { base58 } from "./prices";

// Program-derived addresses, as web3.js PublicKey.findProgramAddressSync: the first bump (255 down) whose
// sha256(seeds, bump, program, "ProgramDerivedAddress") is NOT a point on the ed25519 curve.
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function decode58(s: string): Uint8Array {
  let n = 0n;
  for (const c of s) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) throw new Error("bad base58");
    n = n * 58n + BigInt(i);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n % 256n));
    n /= 256n;
  }
  for (const c of s) {
    if (c !== "1") break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

const onCurve = (b: Uint8Array) => {
  try {
    ed25519.ExtendedPoint.fromHex(b);
    return true;
  } catch {
    return false;
  }
};

const enc = new TextEncoder();
export function findPda(seeds: (string | Uint8Array)[], programId: string): string {
  const parts = seeds.map((s) => (typeof s === "string" ? enc.encode(s) : s));
  const program = decode58(programId);
  const tail = enc.encode("ProgramDerivedAddress");
  for (let bump = 255; bump >= 0; bump--) {
    const all = [...parts, Uint8Array.of(bump), program, tail];
    const buf = new Uint8Array(all.reduce((t, a) => t + a.length, 0));
    let o = 0;
    for (const a of all) {
      buf.set(a, o);
      o += a.length;
    }
    const h = sha256(buf);
    if (!onCurve(h)) return base58(h);
  }
  throw new Error("no PDA");
}

export const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

// Associated Token Account: PDA(["wallet", "token_program", "mint"], ATOKEN)
export function findAta(owner: string, mint: string, tokenProgram = TOKEN_PROGRAM_ID): string {
  return findPda([decode58(owner), decode58(tokenProgram), decode58(mint)], ASSOCIATED_TOKEN_PROGRAM_ID);
}

