import { type PublicKey, TransactionInstruction } from "@solana/web3.js";

import { ASSOCIATED_TOKEN_PROGRAM, SYSTEM_PROGRAM, TOKEN_PROGRAM } from "./program-accounts";

const CREATE_IDEMPOTENT = 1;
const CLOSE_ACCOUNT = 9;
const SYNC_NATIVE = 17;
const INITIALIZE_ACCOUNT_3 = 18;

export function createAssociatedTokenAccountIdempotent(payer: PublicKey, address: PublicKey, owner: PublicKey, mint: PublicKey, tokenProgram: PublicKey) {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM,
    data: Buffer.from([CREATE_IDEMPOTENT]),
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: address, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
  });
}

export function syncNative(account: PublicKey) {
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM,
    data: Buffer.from([SYNC_NATIVE]),
    keys: [{ pubkey: account, isSigner: false, isWritable: true }],
  });
}

export function initializeAccount3(account: PublicKey, mint: PublicKey, owner: PublicKey) {
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM,
    data: Buffer.concat([Buffer.from([INITIALIZE_ACCOUNT_3]), owner.toBuffer()]),
    keys: [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
    ],
  });
}

export function closeAccount(account: PublicKey, destination: PublicKey, owner: PublicKey) {
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM,
    data: Buffer.from([CLOSE_ACCOUNT]),
    keys: [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
  });
}
