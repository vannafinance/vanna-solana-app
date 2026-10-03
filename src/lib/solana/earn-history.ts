import { type AssetSymbol } from "./assets";
import { API_BASE_URL } from "./config";
import { assetOf, baseUnits, rowsOf } from "./history-rows";
import { requestJson } from "./request-json";

export type EarnEvent = {
  kind: "supply" | "withdraw";
  symbol: AssetSymbol;
  amount: bigint | null;
  signature: string;
  timestamp: number;
};

// Supplies and withdrawals as the web app's own history route reports them, so both apps show the same rows.
export function earnEventsFromPayload(payload: unknown): EarnEvent[] {
  return rowsOf(payload)
    .flatMap((row): EarnEvent[] => {
      const asset = assetOf(row.asset);
      const kind = row.type === "supply" || row.type === "withdraw" ? row.type : null;
      const failed = row.status !== undefined && row.status !== "success";
      if (!asset || !kind || failed || typeof row.hash !== "string" || typeof row.timestamp !== "number") return [];
      return [{ kind, symbol: asset.symbol, amount: baseUnits(row.amount, asset.decimals), signature: row.hash, timestamp: row.timestamp }];
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function fetchEarnEvents(wallet: string, signal?: AbortSignal): Promise<EarnEvent[]> {
  return earnEventsFromPayload(await requestJson(`${API_BASE_URL}/api/solana/history?kind=earn&address=${wallet}`, { signal }));
}
