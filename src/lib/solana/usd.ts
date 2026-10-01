export const USD_DECIMALS = 6;

const SCALE = 10 ** USD_DECIMALS;

export function usdToUnits(value: number): bigint {
  if (!Number.isFinite(value)) throw new RangeError("USD amount must be finite");
  return BigInt(Math.round(value * SCALE));
}
