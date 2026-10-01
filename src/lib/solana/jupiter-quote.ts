import { API_BASE_URL } from "./config";
import { ApiError, requestJson } from "./request-json";

export type JupiterQuote = {
  amountOut: bigint;
  minReceived: bigint;
  priceImpactBps: number;
};

const NO_ROUTE_STATUS = 400;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function integer(source: Record<string, unknown>, key: string): bigint {
  const value = source[key];
  if (typeof value !== "string" || !/^\d+$/.test(value)) throw new ApiError("invalid-response");
  return BigInt(value);
}

export function parseJupiterQuote(payload: unknown): JupiterQuote {
  if (!isRecord(payload)) throw new ApiError("invalid-response");
  const impact = Number(payload.priceImpactPct);
  if (!Number.isFinite(impact)) throw new ApiError("invalid-response");
  return {
    amountOut: integer(payload, "outAmount"),
    minReceived: integer(payload, "otherAmountThreshold"),
    priceImpactBps: Math.round(impact * 10_000),
  };
}

export class NoRouteError extends Error {
  constructor() {
    super("No route found for this pair and amount.");
    this.name = "NoRouteError";
  }
}

// The web app proxies Jupiter and restricts it to the pools the fork can execute against.
export async function fetchJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: bigint,
  slippageBps: number,
  signal?: AbortSignal,
): Promise<JupiterQuote> {
  const query = new URLSearchParams({ inputMint, outputMint, amount: amount.toString(), slippageBps: String(slippageBps) });
  try {
    return parseJupiterQuote(await requestJson(`${API_BASE_URL}/api/jupiter/quote?${query}`, { signal }));
  } catch (error) {
    if (error instanceof ApiError && error.status === NO_ROUTE_STATUS) throw new NoRouteError();
    throw error;
  }
}
