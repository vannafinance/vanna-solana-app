import type { MarginAccountSnapshot } from "@/types/account";

import { API_BASE_URL } from "./config";
import { ApiError, requestJson } from "./request-json";
import { usdToUnits } from "./usd";

// The web app reports "no debt" as a health factor of 999.
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
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finite(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ApiError("invalid-response");
  return value;
}

export function parseAccountSnapshot(payload: unknown): MarginAccountSnapshot {
  if (!isRecord(payload) || typeof payload.hasMarginAccount !== "boolean") throw new ApiError("invalid-response");
  if (!payload.hasMarginAccount) return EMPTY;
  if (typeof payload.marginAccountAddress !== "string") throw new ApiError("invalid-response");

  const gross = finite(payload, "grossCollateralValue");
  const netAvailable = finite(payload, "netAvailableCollateral");
  const health = finite(payload, "avgHealthFactor");

  return {
    hasMarginAccount: true,
    address: payload.marginAccountAddress,
    collateral: usdToUnits(finite(payload, "totalCollateralValue")),
    borrowed: usdToUnits(finite(payload, "totalBorrowedValue")),
    netAvailable: usdToUnits(Math.max(netAvailable, 0)),
    roomBeforeLiquidation: usdToUnits(Math.max(finite(payload, "collateralLeftBeforeLiquidation"), 0)),
    health: health >= HEALTH_INFINITY ? null : health,
    leverage: netAvailable > 0 ? gross / netAvailable : gross > 0 ? 1 : null,
    borrowRatePercent: finite(payload, "borrowRate"),
  };
}

export async function fetchAccountSnapshot(wallet: string, signal?: AbortSignal): Promise<MarginAccountSnapshot> {
  const payload = await requestJson(`${API_BASE_URL}/api/account/${encodeURIComponent(wallet)}`, { signal });
  return parseAccountSnapshot(payload);
}
