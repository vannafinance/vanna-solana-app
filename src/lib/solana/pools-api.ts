import { API_BASE_URL } from "./config";
import type { AssetSymbol } from "./assets";
import { ApiError, requestJson } from "./request-json";

export type PoolStats = {
  supplyApyPercent: number;
  borrowApyPercent: number;
  totalSupply: number;
  totalBorrowed: number;
  utilizationPercent: number;
  exchangeRate: bigint;
};

// What lenders earn, in percent: the borrow rate spread over all supplied funds, less the reserve fee the program keeps
// before paying them (math reference: fee = interest x reserve_factor). The web app's supplyAPY leaves the fee in, so
// lenders would see about a tenth more than they get; the app works it out from the pool's own figures instead.
export function supplyApy(borrowApyPercent: number, utilizationPercent: number, reserveFactorBps: number): number {
  return Number(((borrowApyPercent * utilizationPercent * (1 - reserveFactorBps / 10_000)) / 100).toFixed(2));
}

// Share-to-underlying rate, kept as a nine-decimal integer so valuation stays in bigint.
export const EXCHANGE_RATE_DECIMALS = 9;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decimalString(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  const parsed = typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) throw new ApiError("invalid-response");
  return parsed;
}

function scaledRate(source: Record<string, unknown>): bigint {
  const raw = source.exchangeRate;
  const match = typeof raw === "string" ? /^(\d+)(?:\.(\d+))?$/.exec(raw) : null;
  if (!match) throw new ApiError("invalid-response");
  const fraction = (match[2] ?? "").padEnd(EXCHANGE_RATE_DECIMALS, "0").slice(0, EXCHANGE_RATE_DECIMALS);
  return BigInt(match[1]) * 10n ** BigInt(EXCHANGE_RATE_DECIMALS) + BigInt(fraction);
}

export function parsePools(payload: unknown): Partial<Record<AssetSymbol, PoolStats>> {
  if (!isRecord(payload)) throw new ApiError("invalid-response");
  const pools: Partial<Record<AssetSymbol, PoolStats>> = {};
  for (const [symbol, value] of Object.entries(payload)) {
    if (!isRecord(value)) throw new ApiError("invalid-response");
    const reserveFactor = value.reserveFactorBps;
    pools[symbol as AssetSymbol] = {
      supplyApyPercent:
        typeof reserveFactor === "number" && Number.isFinite(reserveFactor)
          ? supplyApy(decimalString(value, "borrowAPY"), decimalString(value, "utilizationRate"), reserveFactor)
          : decimalString(value, "supplyAPY"),
      borrowApyPercent: decimalString(value, "borrowAPY"),
      totalSupply: decimalString(value, "totalSupply"),
      totalBorrowed: decimalString(value, "totalBorrowed"),
      utilizationPercent: decimalString(value, "utilizationRate"),
      exchangeRate: scaledRate(value),
    };
  }
  return pools;
}

export async function fetchPools(signal?: AbortSignal) {
  return parsePools(await requestJson(`${API_BASE_URL}/api/pools`, { signal }));
}
