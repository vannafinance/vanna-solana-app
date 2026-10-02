import type { MarginAccountSnapshot } from "@/types/account";

import { API_BASE_URL } from "./config";
import { assets, type AssetSymbol } from "./assets";
import { ApiError, requestJson } from "./request-json";
import { usdToUnits } from "./usd";

// The web app reports "no debt" as a health factor of 999, and as 0 for an account that holds nothing yet.
const HEALTH_INFINITY = 999;

const EMPTY: MarginAccountSnapshot = {
  hasMarginAccount: false,
  address: null,
  collateral: 0n,
  borrowed: 0n,
  netAvailable: 0n,
  roomBeforeLiquidation: 0n,
  health: null,
  leverage: null,
  borrowRatePercent: 0,
  collateralBalances: {},
  borrowedBalances: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finite(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ApiError("invalid-response");
  return value;
}

// The API reports each balance as a decimal string in whole tokens; keep it exact in base units.
function unitsFromDecimal(text: string, decimals: number): bigint {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new ApiError("invalid-response");
  return BigInt(match[1]) * 10n ** BigInt(decimals) + BigInt((match[2] ?? "").padEnd(decimals, "0").slice(0, decimals) || "0");
}

function parseBalances(value: unknown): Partial<Record<AssetSymbol, bigint>> {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new ApiError("invalid-response");
  const balances: Partial<Record<AssetSymbol, bigint>> = {};
  for (const asset of assets) {
    const entry = value[asset.symbol];
    if (entry === undefined) continue;
    if (!isRecord(entry) || typeof entry.amount !== "string") throw new ApiError("invalid-response");
    balances[asset.symbol] = unitsFromDecimal(entry.amount, asset.decimals);
  }
  return balances;
}

export function parseAccountSnapshot(payload: unknown): MarginAccountSnapshot {
  if (!isRecord(payload) || typeof payload.hasMarginAccount !== "boolean") throw new ApiError("invalid-response");
  if (!payload.hasMarginAccount) return EMPTY;
  if (typeof payload.marginAccountAddress !== "string") throw new ApiError("invalid-response");

  const gross = finite(payload, "grossCollateralValue");
  const netAvailable = finite(payload, "netAvailableCollateral");
  const health = finite(payload, "avgHealthFactor");
  const borrowedValue = finite(payload, "totalBorrowedValue");

  return {
    hasMarginAccount: true,
    address: payload.marginAccountAddress,
    collateral: usdToUnits(finite(payload, "totalCollateralValue")),
    borrowed: usdToUnits(borrowedValue),
    netAvailable: usdToUnits(Math.max(netAvailable, 0)),
    roomBeforeLiquidation: usdToUnits(Math.max(finite(payload, "collateralLeftBeforeLiquidation"), 0)),
    health: health >= HEALTH_INFINITY || borrowedValue === 0 ? null : health,
    leverage: netAvailable > 0 ? gross / netAvailable : gross > 0 ? 1 : null,
    borrowRatePercent: finite(payload, "borrowRate"),
    collateralBalances: parseBalances(payload.collateralBalances),
    borrowedBalances: parseBalances(payload.borrowedBalances),
  };
}

export async function fetchAccountSnapshot(wallet: string, signal?: AbortSignal): Promise<MarginAccountSnapshot> {
  const payload = await requestJson(`${API_BASE_URL}/api/account/${encodeURIComponent(wallet)}`, { signal });
  return parseAccountSnapshot(payload);
}
