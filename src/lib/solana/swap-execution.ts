import { type Connection, VersionedTransaction } from "@solana/web3.js";

import { API_BASE_URL } from "./config";
import { fetchRawJupiterQuote } from "./jupiter-quote";
import { ApiError, requestJson } from "./request-json";
import { type SigningHooks, simulateSignAndSend } from "./send-transaction";
import { withStalePoolRetry } from "./retry-stale-pool";

export type SwapRequest = {
  owner: string;
  inputMint: string;
  outputMint: string;
  amount: bigint;
  slippageBps: number;
};

export type SwapHooks = SigningHooks;

function swapTransactionOf(payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "swapTransaction" in payload && typeof payload.swapTransaction === "string") return payload.swapTransaction;
  throw new ApiError("invalid-response");
}

async function attempt(connection: Connection, request: SwapRequest, hooks: SwapHooks): Promise<string> {
  const { response } = await fetchRawJupiterQuote(request.inputMint, request.outputMint, request.amount, request.slippageBps);
  const built = await requestJson(`${API_BASE_URL}/api/jupiter/swap`, { body: { quoteResponse: response, userPublicKey: request.owner } });
  const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransactionOf(built), "base64"));

  // Jupiter builds against mainnet; the fork has its own blockhash queue, and the wallet must sign that lifetime.
  const latest = await connection.getLatestBlockhash("confirmed");
  transaction.message.recentBlockhash = latest.blockhash;

  return simulateSignAndSend(connection, transaction, latest.lastValidBlockHeight, hooks);
}

export function executeWalletSwap(connection: Connection, request: SwapRequest, hooks: SwapHooks): Promise<string> {
  return withStalePoolRetry(hooks, (tracked) => attempt(connection, request, tracked));
}
