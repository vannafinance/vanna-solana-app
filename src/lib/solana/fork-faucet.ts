import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import { type AssetInfo, assets, type AssetSymbol } from "./assets";
import { API_BASE_URL, FORK_CHEATCODES_ENABLED, RPC_URL } from "./config";
import { associatedTokenAddress, tokenProgramOf } from "./program-accounts";
import { ApiError, requestJson } from "./request-json";
import { rpcConnection } from "./rpc";

export const FAUCET_SYMBOLS = ["SOL", "USDC", "TSLAx", "GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI", "SKR"] as const satisfies readonly AssetSymbol[];

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
  SKR: "+2,000 SKR each claim",
};

// The tokens the hosted web app's faucet route mints. SKR is not one of them: the website does not carry it, so the app
// sets the balance on the fork itself (fundOnFork).
const HOSTED_FAUCET: ReadonlySet<FaucetSymbol> = new Set(["USDC", "TSLAx", "GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI"]);

// Whole tokens one claim adds when the app funds the wallet itself, matching the web app's SKR amount.
const FORK_GRANT: Partial<Record<FaucetSymbol, bigint>> = { SKR: 2_000n };

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

async function tokenBalance(account: PublicKey): Promise<bigint> {
  const balance = await rpcConnection.getTokenAccountBalance(account, "confirmed").catch(() => null);
  return balance === null ? 0n : BigInt(balance.value.amount);
}

// The same Surfpool cheatcode the web app's faucet route calls, sent straight to the fork RPC: it sets the wallet's token
// account to its balance plus the grant. Only for plain SPL mints (SKR); Token-2022 mints with a transfer fee need an
// account layout the cheatcode does not write, which is why those stay on the hosted route.
async function fundOnFork(asset: AssetInfo & { symbol: FaucetSymbol }, address: string, grant: bigint): Promise<FaucetGrant> {
  if (!FORK_CHEATCODES_ENABLED || asset.token2022) throw new ApiError("invalid-response");
  const owner = new PublicKey(address);
  const mint = new PublicKey(asset.mint);
  const program = tokenProgramOf(asset);
  const account = associatedTokenAddress(owner, mint, program);
  const added = grant * 10n ** BigInt(asset.decimals);
  try {
    const before = await tokenBalance(account);
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "surfnet_setTokenAccount", params: [owner.toBase58(), mint.toBase58(), { amount: Number(before + added) }, program.toBase58()] }),
    });
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || "error" in body) throw new ApiError("invalid-response");
    for (let poll = 0; poll < BALANCE_POLLS; poll++) {
      if ((await tokenBalance(account)) >= before + added) return { symbol: asset.symbol, added, decimals: asset.decimals };
      await sleep(BALANCE_POLL_MS);
    }
  } catch (error) {
    throw error instanceof ApiError ? error : new ApiError("network");
  }
  throw new ApiError("timeout");
}

// The listed tokens are minted through a Surfpool cheatcode behind the web app's faucet route, so they only exist on the
// fork; a token the route does not serve is funded on the fork directly.
export async function requestFaucetGrant(symbol: FaucetSymbol, address: string): Promise<FaucetGrant> {
  if (symbol === "SOL") return airdropSol(address);
  const grant = FORK_GRANT[symbol];
  if (!HOSTED_FAUCET.has(symbol) && grant !== undefined) {
    const asset = assets.find((candidate): candidate is AssetInfo & { symbol: FaucetSymbol } => candidate.symbol === symbol);
    if (asset === undefined) throw new ApiError("invalid-response");
    return fundOnFork(asset, address, grant);
  }
  const payload = await requestJson(`${API_BASE_URL}/api/faucet/fork/${symbol}`, { body: { address } });
  const decimals = assets.find((asset) => asset.symbol === symbol)?.decimals;
  if (decimals === undefined) throw new ApiError("invalid-response");
  return { symbol, added: addedAmount(payload), decimals };
}
