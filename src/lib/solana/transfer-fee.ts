import { type Connection, PublicKey } from "@solana/web3.js";

import type { AssetInfo } from "./assets";

const MINT_BASE_SIZE = 165;
const EXTENSIONS_OFFSET = 166;
const TRANSFER_FEE_CONFIG = 1;
const FEE_DENOMINATOR = 10_000n;

type TransferFee = { epoch: bigint; maximumFee: bigint; basisPoints: bigint };
export type TransferFeeSchedule = { older: TransferFee; newer: TransferFee };

function readFee(view: DataView, offset: number): TransferFee {
  return { epoch: view.getBigUint64(offset, true), maximumFee: view.getBigUint64(offset + 8, true), basisPoints: BigInt(view.getUint16(offset + 16, true)) };
}

// Token-2022 mints append their extensions as type/length/value entries after the 165 byte base account layout.
// TransferFeeConfig keeps two fee schedules (older, newer) and the newer one applies from its own epoch.
export function readTransferFeeSchedule(data: Uint8Array): TransferFeeSchedule | null {
  if (data.byteLength <= EXTENSIONS_OFFSET) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let offset = EXTENSIONS_OFFSET; offset + 4 <= data.byteLength; ) {
    const type = view.getUint16(offset, true);
    const length = view.getUint16(offset + 2, true);
    const body = offset + 4;
    if (type === TRANSFER_FEE_CONFIG && length >= 108) {
      return { older: readFee(view, body + 72), newer: readFee(view, body + 90) };
    }
    offset = body + length;
  }
  return null;
}

export function transferFeeAt(schedule: TransferFeeSchedule, epoch: bigint, amount: bigint): bigint {
  const fee = epoch >= schedule.newer.epoch ? schedule.newer : schedule.older;
  if (fee.basisPoints === 0n || amount === 0n) return 0n;
  const numerator = amount * fee.basisPoints;
  const raw = numerator / FEE_DENOMINATOR + (numerator % FEE_DENOMINATOR > 0n ? 1n : 0n);
  return raw > fee.maximumFee ? fee.maximumFee : raw;
}

// A margin swap's first leg is a real Token-2022 transfer, so for a mint that charges a fee only the amount net of that
// fee reaches Jupiter's route. The contract takes the same fee from the live config for the current epoch.
export async function inputTransferFee(connection: Connection, asset: AssetInfo, gross: bigint): Promise<bigint> {
  if (!asset.token2022) return 0n;
  const [info, epochInfo] = await Promise.all([connection.getAccountInfo(new PublicKey(asset.mint), "confirmed"), connection.getEpochInfo("confirmed")]);
  if (info === null || info.data.byteLength <= MINT_BASE_SIZE) return 0n;
  const schedule = readTransferFeeSchedule(info.data);
  return schedule === null ? 0n : transferFeeAt(schedule, BigInt(epochInfo.epoch), gross);
}
