import { PublicKey } from "@solana/web3.js";

const MARGIN_SWAPPED = [25, 110, 111, 203, 233, 54, 199, 222];
const BORROWED = [225, 182, 241, 78, 34, 145, 253, 230];
const PROGRAM_DATA = "Program data: ";
const KEY_LENGTH = 32;
const MARGIN_SWAPPED_LENGTH = 8 + KEY_LENGTH * 3 + 8 * 3;
const BORROWED_MIN_LENGTH = 8 + KEY_LENGTH * 2 + 8;

export type MarginSwapped = { margin: string; inputMint: string; outputMint: string; amountIn: bigint; amountOut: bigint };
export type Borrowed = { margin: string; reserve: string; assets: bigint };

function hasDiscriminator(data: Uint8Array, discriminator: readonly number[]) {
  return discriminator.every((byte, index) => data[index] === byte);
}

const keyAt = (data: Uint8Array, offset: number) => new PublicKey(data.subarray(offset, offset + KEY_LENGTH)).toBase58();
const u64At = (data: Uint8Array, offset: number) => new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(offset, true);

// Anchor programs emit events as base64 "Program data" log lines: an 8 byte discriminator, then the fields in order.
// The swap's own instruction only carries the input amount and a minimum, so the executed amounts exist only here.
export function decodeMarginEvents(logs: readonly string[]): { swaps: MarginSwapped[]; borrows: Borrowed[] } {
  const swaps: MarginSwapped[] = [];
  const borrows: Borrowed[] = [];
  for (const line of logs) {
    if (!line.startsWith(PROGRAM_DATA)) continue;
    const data = Buffer.from(line.slice(PROGRAM_DATA.length), "base64");
    if (data.length === MARGIN_SWAPPED_LENGTH && hasDiscriminator(data, MARGIN_SWAPPED)) {
      swaps.push({ margin: keyAt(data, 8), inputMint: keyAt(data, 40), outputMint: keyAt(data, 72), amountIn: u64At(data, 104), amountOut: u64At(data, 112) });
    } else if (data.length >= BORROWED_MIN_LENGTH && hasDiscriminator(data, BORROWED)) {
      borrows.push({ margin: keyAt(data, 8), reserve: keyAt(data, 40), assets: u64At(data, 72) });
    }
  }
  return { swaps, borrows };
}
