// A Lend pool's interest rate curve, with the exact bigint maths of the web app (apps/solana/lib/solana/math.ts: annualBorrowRate /
// annualSupplyRate, ports of the on-chain interest.rs). The coefficients are the pool's own, read from its Reserve account
// (pools.ts decodeReserve): linear u64 at offset 216, jump u64 at 224, multiplier u64 at 232, each a WAD fraction (1e18 = 1.0), and
// the reserve factor u16 at 240, in basis points.
//   borrow APR = mult x (linear x u + linear x u^32 + jump x u^64), u = utilization
//   supply APR = borrow APR x u x (1 - reserve factor)
export const WAD = 1_000_000_000_000_000_000n;
const HALF_WAD = WAD / 2n;
// The program's year (365.2425 days), as interest.rs.
export const SECONDS_PER_YEAR = 31_556_952n;
const BPS = 10_000;

export type CurveWad = { linear: bigint; jump: bigint; mult: bigint };

// base^exp in WAD, rounding half up at each step (math.ts wadPow).
export function wadPow(base: bigint, exp: number): bigint {
  const mul = (a: bigint, c: bigint) => (a * c + HALF_WAD) / WAD;
  if (base === 0n) return exp === 0 ? WAD : 0n;
  let result = exp % 2 === 1 ? base : WAD, e = Math.floor(exp / 2), b = base;
  while (e > 0) {
    b = mul(b, b);
    if (e % 2 === 1) result = mul(result, b);
    e = Math.floor(e / 2);
  }
  return result;
}

// Borrow rate per second in WAD at utilization u (WAD).
export function ratePerSecWad(c: CurveWad, u: bigint): bigint {
  const poly = (u * c.linear) / WAD + (wadPow(u, 32) * c.linear) / WAD + (wadPow(u, 64) * c.jump) / WAD;
  return (c.mult * poly) / (SECONDS_PER_YEAR * WAD);
}

/** Yearly borrow rate as a fraction (0.0339 = 3.39%) at utilization u (WAD). */
export const annualBorrowRate = (c: CurveWad, u: bigint) => Number((ratePerSecWad(c, u) * SECONDS_PER_YEAR * 1_000_000_000n) / WAD) / 1e9;

/** Yearly supply rate as a fraction at utilization u (WAD), after the reserve factor (basis points). */
export function annualSupplyRate(c: CurveWad, u: bigint, reserveFactorBps: number): number {
  const util = Number((u * 1_000_000_000n) / WAD) / 1e9;
  return annualBorrowRate(c, u) * util * (1 - reserveFactorBps / BPS);
}

// A utilization fraction (0..1) as WAD, kept to 9 digits like the web chart.
export const utilWad = (u: number) => BigInt(Math.round(Math.max(0, Math.min(1, u)) * 1e9)) * 1_000_000_000n;

export type RateKind = "dep" | "bor";

/** The rate (fraction) for deposits or borrows at utilization u (0..1). */
export const rateAt = (c: CurveWad, reserveFactorBps: number, kind: RateKind, u: number) =>
  kind === "bor" ? annualBorrowRate(c, utilWad(u)) : annualSupplyRate(c, utilWad(u), reserveFactorBps);

/** n + 1 evenly spaced points from 0 to 100% utilization: [utilization 0..1, rate fraction]. */
export function curvePoints(c: CurveWad, reserveFactorBps: number, kind: RateKind, n = 200): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => [i / n, rateAt(c, reserveFactorBps, kind, i / n)]);
}
