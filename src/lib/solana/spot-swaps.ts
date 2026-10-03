import { type AssetSymbol } from "./assets";
import { API_BASE_URL } from "./config";
import { assetOf, baseUnits, rowsOf } from "./history-rows";
import { requestJson } from "./request-json";

export type SpotSwap = {
  signature: string;
  timestamp: number;
  from: AssetSymbol;
  to: AssetSymbol;
  amountIn: bigint;
  decimalsIn: number;
  amountOut: bigint;
  decimalsOut: number;
};

// A wallet's Jupiter swaps as the web app's own spot history route reports them, so both apps show the same rows.
export function spotSwapsFromPayload(payload: unknown): SpotSwap[] {
  return rowsOf(payload)
    .flatMap((row): SpotSwap[] => {
      const from = assetOf(row.assetIn);
      const to = assetOf(row.assetOut);
      if (!from || !to || typeof row.hash !== "string" || typeof row.timestamp !== "number") return [];
      const amountIn = baseUnits(row.amountIn, from.decimals);
      const amountOut = baseUnits(row.amountOut, to.decimals);
      if (amountIn === null || amountOut === null) return [];
      return [{ signature: row.hash, timestamp: row.timestamp, from: from.symbol, to: to.symbol, amountIn, decimalsIn: from.decimals, amountOut, decimalsOut: to.decimals }];
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function fetchSpotSwaps(wallet: string, signal?: AbortSignal): Promise<SpotSwap[]> {
  return spotSwapsFromPayload(await requestJson(`${API_BASE_URL}/api/solana/spot-history?address=${wallet}`, { signal }));
}
