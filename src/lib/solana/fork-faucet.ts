import { assets, type AssetSymbol } from "./assets";
import { API_BASE_URL } from "./config";
import { ApiError, requestJson } from "./request-json";

export const FAUCET_SYMBOLS = ["USDC", "TSLAx", "GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI"] as const satisfies readonly AssetSymbol[];

export type FaucetSymbol = (typeof FAUCET_SYMBOLS)[number];

export type FaucetGrant = { symbol: FaucetSymbol; added: bigint; decimals: number };

function addedAmount(payload: unknown): bigint {
  if (typeof payload === "object" && payload !== null && "added" in payload && typeof payload.added === "string" && /^\d+$/.test(payload.added)) {
    return BigInt(payload.added);
  }
  throw new ApiError("invalid-response");
}

// The web app's fork faucet mints through a Surfpool cheatcode, so it only exists on the fork.
export async function requestFaucetGrant(symbol: FaucetSymbol, address: string): Promise<FaucetGrant> {
  const payload = await requestJson(`${API_BASE_URL}/api/faucet/fork/${symbol}`, { body: { address } });
  const decimals = assets.find((asset) => asset.symbol === symbol)?.decimals;
  if (decimals === undefined) throw new ApiError("invalid-response");
  return { symbol, added: addedAmount(payload), decimals };
}
