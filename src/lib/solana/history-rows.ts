import { parseUnits } from "@/format/format-amount";

import { assets } from "./assets";
import { ApiError } from "./request-json";

export type HistoryRow = Record<string, unknown>;

// The web app's history routes answer with `{ rows: [...] }`; anything else is a broken answer, not an empty history.
export function rowsOf(payload: unknown): HistoryRow[] {
  if (typeof payload !== "object" || payload === null || !("rows" in payload) || !Array.isArray(payload.rows)) throw new ApiError("invalid-response");
  return payload.rows.filter((row): row is HistoryRow => typeof row === "object" && row !== null);
}

export function assetOf(symbol: unknown) {
  return typeof symbol === "string" ? assets.find((asset) => asset.symbol === symbol) : undefined;
}

// A row carries its amounts as decimal text. The server adds floats, so a few rows have more digits than the asset has.
export function baseUnits(text: unknown, decimals: number): bigint | null {
  return typeof text === "string" ? parseUnits(text, decimals) : null;
}
