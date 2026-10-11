const RESERVE_DISCRIMINATOR = [43, 242, 204, 202, 26, 247, 59, 127];
const DEBT_POSITION_DISCRIMINATOR = [234, 251, 104, 142, 74, 57, 146, 84];
const ACCOUNTED_LIQUIDITY_OFFSET = 152;
const TOTAL_BORROW_ASSETS_OFFSET = 160;
const TOTAL_BORROW_SHARES_OFFSET = 168;
const LAST_UPDATE_OFFSET = 208;
const BASE_RATE_OFFSET = 216;
const RESERVE_END = 228;
const DEBT_SHARES_OFFSET = 72;
const DEBT_POSITION_END = 88;
const BPS = 10_000n;
const SECONDS_PER_YEAR = 31_536_000n;
const CLOCK_TIMESTAMP_OFFSET = 32;

export type ReserveDebt = {
  accountedLiquidity: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  baseRateBps: bigint;
  slope1Bps: bigint;
  slope2Bps: bigint;
  optimalBps: bigint;
};

const hasDiscriminator = (data: Uint8Array, discriminator: readonly number[]) => discriminator.every((byte, index) => data[index] === byte);
const viewOf = (data: Uint8Array) => new DataView(data.buffer, data.byteOffset, data.byteLength);

export const ceilDiv = (numerator: bigint, denominator: bigint) => (numerator === 0n ? 0n : (numerator + denominator - 1n) / denominator);

export function decodeReserveDebt(data: Uint8Array): ReserveDebt {
  if (data.byteLength < RESERVE_END || !hasDiscriminator(data, RESERVE_DISCRIMINATOR)) throw new Error("Not a lending reserve");
  const view = viewOf(data);
  const bps = (index: number) => BigInt(view.getUint16(BASE_RATE_OFFSET + index * 2, true));
  return {
    accountedLiquidity: view.getBigUint64(ACCOUNTED_LIQUIDITY_OFFSET, true),
    totalBorrowAssets: view.getBigUint64(TOTAL_BORROW_ASSETS_OFFSET, true),
    totalBorrowShares: view.getBigUint64(TOTAL_BORROW_SHARES_OFFSET, true) + (view.getBigUint64(TOTAL_BORROW_SHARES_OFFSET + 8, true) << 64n),
    lastUpdate: view.getBigInt64(LAST_UPDATE_OFFSET, true),
    baseRateBps: bps(0),
    slope1Bps: bps(1),
    slope2Bps: bps(2),
    optimalBps: bps(3),
  };
}

export function decodeDebtShares(data: Uint8Array): bigint {
  if (data.byteLength < DEBT_POSITION_END || !hasDiscriminator(data, DEBT_POSITION_DISCRIMINATOR)) throw new Error("Not a debt position");
  const view = viewOf(data);
  return view.getBigUint64(DEBT_SHARES_OFFSET, true) + (view.getBigUint64(DEBT_SHARES_OFFSET + 8, true) << 64n);
}

// The cluster clock's unix timestamp: the program accrues interest up to this instant, so a figure projected to it
// matches what the instruction will see.
export function clockTimestamp(data: Uint8Array): bigint {
  return viewOf(data).getBigInt64(CLOCK_TIMESTAMP_OFFSET, true);
}

// Same integer interest projection the program applies when it accrues the reserve.
export function projectReserveDebt(reserve: ReserveDebt, now: bigint): { totalDebt: bigint; rateBps: bigint } {
  const { totalBorrowAssets, accountedLiquidity, optimalBps, baseRateBps, slope1Bps, slope2Bps } = reserve;
  const total = totalBorrowAssets + accountedLiquidity;
  const utilization = total === 0n ? 0n : (totalBorrowAssets * BPS) / total;
  const variable =
    utilization <= optimalBps
      ? optimalBps === 0n
        ? 0n
        : (slope1Bps * utilization) / optimalBps
      : slope1Bps + (slope2Bps * (utilization - optimalBps)) / (BPS - optimalBps);
  const rateBps = baseRateBps + variable;
  const elapsed = now - reserve.lastUpdate;
  const totalDebt = elapsed > 0n ? totalBorrowAssets + ceilDiv(totalBorrowAssets * rateBps * elapsed, BPS * SECONDS_PER_YEAR) : totalBorrowAssets;
  return { totalDebt, rateBps };
}

// Mirrors the program's own rounding when a borrow mints debt shares: one to one while nothing is borrowed.
export function assetsToDebtSharesUp(assets: bigint, totalShares: bigint, totalDebt: bigint): bigint {
  if (totalShares === 0n || totalDebt === 0n) return assets;
  return ceilDiv(assets * totalShares, totalDebt);
}
