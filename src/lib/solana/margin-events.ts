import { PublicKey } from "@solana/web3.js";

const MARGIN_SWAPPED = [25, 110, 111, 203, 233, 54, 199, 222];
const BORROWED = [225, 182, 241, 78, 34, 145, 253, 230];
const COLLATERAL_DEPOSITED = [244, 62, 77, 11, 135, 112, 61, 96];
const COLLATERAL_WITHDRAWN = [51, 224, 133, 106, 74, 173, 72, 82];
const DEBT_REPAID = [145, 11, 56, 225, 154, 212, 54, 105];
const LITE_OPENED = [183, 79, 102, 12, 14, 22, 68, 6];
const LITE_CLOSED = [223, 92, 122, 13, 82, 201, 161, 171];
const PROGRAM_DATA = "Program data: ";
const KEY = 32;
const DISCRIMINATOR = 8;

export type MarginSwapped = { margin: string; inputMint: string; outputMint: string; amountIn: bigint; amountOut: bigint };
export type Borrowed = { margin: string; reserve: string; assets: bigint };
export type CollateralMoved = { margin: string; mint: string; amount: bigint };
export type DebtRepaid = { margin: string; reserve: string; assets: bigint };
export type LiteOpened = { margin: string; strategy: string; equity: bigint };
export type LiteClosed = { margin: string; strategy: string; debtRepaid: bigint; residual: bigint };

export type MarginEvents = {
  swaps: MarginSwapped[];
  borrows: Borrowed[];
  deposits: CollateralMoved[];
  withdrawals: CollateralMoved[];
  repayments: DebtRepaid[];
  liteOpened: LiteOpened[];
  liteClosed: LiteClosed[];
};

function hasDiscriminator(data: Uint8Array, discriminator: readonly number[]) {
  return discriminator.every((byte, index) => data[index] === byte);
}

const keyAt = (data: Uint8Array, offset: number) => new PublicKey(data.subarray(offset, offset + KEY)).toBase58();
const u64At = (data: Uint8Array, offset: number) => new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(offset, true);

// A named event: its discriminator and the shortest length that holds every field read from it.
function matches(data: Uint8Array, discriminator: readonly number[], minLength: number) {
  return data.length >= minLength && hasDiscriminator(data, discriminator);
}

// Anchor programs emit events as base64 "Program data" log lines: an 8 byte discriminator, then the fields in order.
// A swap's own instruction only carries the input amount and a minimum, so the executed amounts exist only here.
export function decodeMarginEvents(logs: readonly string[]): MarginEvents {
  const events: MarginEvents = { swaps: [], borrows: [], deposits: [], withdrawals: [], repayments: [], liteOpened: [], liteClosed: [] };
  for (const line of logs) {
    if (!line.startsWith(PROGRAM_DATA)) continue;
    const data = Buffer.from(line.slice(PROGRAM_DATA.length), "base64");
    const margin = data.length >= DISCRIMINATOR + KEY ? keyAt(data, DISCRIMINATOR) : "";
    const second = data.length >= DISCRIMINATOR + KEY * 2 ? keyAt(data, DISCRIMINATOR + KEY) : "";

    if (data.length === DISCRIMINATOR + KEY * 3 + 8 * 3 && hasDiscriminator(data, MARGIN_SWAPPED)) {
      events.swaps.push({ margin, inputMint: second, outputMint: keyAt(data, 72), amountIn: u64At(data, 104), amountOut: u64At(data, 112) });
    } else if (matches(data, BORROWED, DISCRIMINATOR + KEY * 2 + 8)) {
      events.borrows.push({ margin, reserve: second, assets: u64At(data, 72) });
    } else if (matches(data, COLLATERAL_DEPOSITED, DISCRIMINATOR + KEY * 2 + 8)) {
      events.deposits.push({ margin, mint: second, amount: u64At(data, 72) });
    } else if (matches(data, COLLATERAL_WITHDRAWN, DISCRIMINATOR + KEY * 2 + 8)) {
      events.withdrawals.push({ margin, mint: second, amount: u64At(data, 72) });
    } else if (matches(data, DEBT_REPAID, DISCRIMINATOR + KEY * 3 + 8)) {
      events.repayments.push({ margin, reserve: second, assets: u64At(data, 104) });
    } else if (matches(data, LITE_OPENED, DISCRIMINATOR + KEY * 2 + 8)) {
      events.liteOpened.push({ margin, strategy: second, equity: u64At(data, 72) });
    } else if (matches(data, LITE_CLOSED, DISCRIMINATOR + KEY * 2 + 8 * 3)) {
      events.liteClosed.push({ margin, strategy: second, debtRepaid: u64At(data, 80), residual: u64At(data, 88) });
    }
  }
  return events;
}
