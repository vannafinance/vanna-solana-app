import { type PublicKey, TransactionInstruction } from "@solana/web3.js";

import { VANNA_PROGRAM } from "./program-accounts";

const U64_MAX = (1n << 64n) - 1n;
const U128_MAX = (1n << 128n) - 1n;

// Anchor instruction data: an 8 byte discriminator followed by the arguments in declaration order.
export class InstructionData {
  private readonly parts: Buffer[];

  constructor(discriminator: readonly number[]) {
    this.parts = [Buffer.from(discriminator)];
  }

  u16(value: number) {
    const part = Buffer.alloc(2);
    part.writeUInt16LE(value);
    this.parts.push(part);
    return this;
  }

  u64(value: bigint) {
    if (value < 0n || value > U64_MAX) throw new RangeError("amount does not fit in u64");
    const part = Buffer.alloc(8);
    part.writeBigUInt64LE(value);
    this.parts.push(part);
    return this;
  }

  u128(value: bigint) {
    if (value < 0n || value > U128_MAX) throw new RangeError("amount does not fit in u128");
    const part = Buffer.alloc(16);
    part.writeBigUInt64LE(value & U64_MAX, 0);
    part.writeBigUInt64LE(value >> 64n, 8);
    this.parts.push(part);
    return this;
  }

  bool(value: boolean) {
    this.parts.push(Buffer.from([value ? 1 : 0]));
    return this;
  }

  bytes(value: Uint8Array) {
    const length = Buffer.alloc(4);
    length.writeUInt32LE(value.length);
    this.parts.push(length, Buffer.from(value));
    return this;
  }

  build(): Buffer {
    return Buffer.concat(this.parts);
  }
}

export type Meta = { pubkey: PublicKey; isSigner?: boolean; isWritable?: boolean };

export function vannaInstruction(data: InstructionData, metas: readonly Meta[]) {
  return new TransactionInstruction({
    programId: VANNA_PROGRAM,
    data: data.build(),
    keys: metas.map(({ pubkey, isSigner = false, isWritable = false }) => ({ pubkey, isSigner, isWritable })),
  });
}
