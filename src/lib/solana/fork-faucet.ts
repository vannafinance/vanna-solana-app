import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import { assets, type AssetSymbol } from "./assets";
import { API_BASE_URL } from "./config";
import { ApiError, requestJson } from "./request-json";
import { rpcConnection } from "./rpc";

export const FAUCET_SYMBOLS = ["SOL", "USDC", "TSLAx", "GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI"] as const satisfies readonly AssetSymbol[];

export type FaucetSymbol = (typeof FAUCET_SYMBOLS)[number];

export type FaucetGrant = { symbol: FaucetSymbol; added: bigint; decimals: number };

// What one claim adds, as the web app's faucet advertises it.
export const FAUCET_CLAIM_LABEL: Record<FaucetSymbol, string> = {
  SOL: "+100 SOL each claim",
  USDC: "+1,000 USDC each claim",
  TSLAx: "+20 TSLAx each claim",
  GOOGLx: "+20 GOOGLx each claim",
  AAPLx: "+20 AAPLx each claim",
  ANTHROPIC: "+20 ANTHROPIC each claim",
  OPENAI: "+20 OPENAI each claim",
};

const SOL_AIRDROP = 100n;
const SOL_DECIMALS = 9;
const BALANCE_POLLS = 20;
const BALANCE_POLL_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function addedAmount(payload: unknown): bigint {
  if (typeof payload === "object" && payload !== null && "added" in payload && typeof payload.added === "string" && /^\d+$/.test(payload.added)) {
    return BigInt(payload.added);
  }
  throw new ApiError("invalid-response");
}

// SOL comes from the fork's own airdrop, as on the web app. The fork does not serve confirmations reliably, so the
// grant is confirmed by watching the balance rise.
async function airdropSol(address: string): Promise<FaucetGrant> {
  const owner = new PublicKey(address);
  try {
    const before = BigInt(await rpcConnection.getBalance(owner));
    await rpcConnection.requestAirdrop(owner, Number(SOL_AIRDROP) * LAMPORTS_PER_SOL);
    for (let poll = 0; poll < BALANCE_POLLS; poll++) {
      const added = BigInt(await rpcConnection.getBalance(owner)) - before;
      if (added > 0n) return { symbol: "SOL", added, decimals: SOL_DECIMALS };
      await sleep(BALANCE_POLL_MS);
    }
  } catch {
    throw new ApiError("network");
  }
  throw new ApiError("timeout");
}

// The other tokens are minted through a Surfpool cheatcode behind the web app's faucet route, so they only exist on the fork.
export async function requestFaucetGrant(symbol: FaucetSymbol, address: string): Promise<FaucetGrant> {
  if (symbol === "SOL") return airdropSol(address);
  const payload = await requestJson(`${API_BASE_URL}/api/faucet/fork/${symbol}`, { body: { address } });
  const decimals = assets.find((asset) => asset.symbol === symbol)?.decimals;
  if (decimals === undefined) throw new ApiError("invalid-response");
  return { symbol, added: addedAmount(payload), decimals };
}
