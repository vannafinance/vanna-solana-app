import type { Connection, ParsedTransactionWithMeta } from "@solana/web3.js";

import { APP_ONLY_ASSETS, type AssetSymbol, assetByMint, NATIVE_SOL_MINT } from "./assets";
import { API_BASE_URL } from "./config";
import { assetOf, baseUnits, rowsOf } from "./history-rows";
import { requestJson } from "./request-json";
import { fetchWalletTransactions, succeededOnly, type WalletTransaction } from "./wallet-transactions";

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

const JUPITER_PROGRAM = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const LAMPORT_DECIMALS = 9;
const DUST_LAMPORTS = 1000n;

type Delta = { raw: bigint; decimals: number };

function tokenDeltas(tx: ParsedTransactionWithMeta, owner: string): Map<string, Delta> {
  const deltas = new Map<string, Delta>();
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const accounts = new Map<number, { mint: string; decimals: number }>();
  for (const balance of [...pre, ...post]) {
    if (balance.owner === owner) accounts.set(balance.accountIndex, { mint: balance.mint, decimals: balance.uiTokenAmount.decimals });
  }

  for (const [index, { mint, decimals }] of accounts) {
    const before = BigInt(pre.find((balance) => balance.accountIndex === index)?.uiTokenAmount.amount ?? "0");
    const after = BigInt(post.find((balance) => balance.accountIndex === index)?.uiTokenAmount.amount ?? "0");
    if (after === before) continue;
    deltas.set(mint, { raw: (deltas.get(mint)?.raw ?? 0n) + after - before, decimals });
  }
  return deltas;
}

// Jupiter wraps and unwraps SOL in a temporary token account inside the same transaction, so a SOL leg is
// invisible in token balances. The wallet's own lamport change (fee added back when it paid it) recovers it.
function nativeSolDelta(tx: ParsedTransactionWithMeta, owner: string): bigint | null {
  const index = tx.transaction.message.accountKeys.findIndex((key) => key.pubkey.toBase58() === owner);
  const pre = tx.meta?.preBalances[index];
  const post = tx.meta?.postBalances[index];
  if (index < 0 || pre === undefined || post === undefined) return null;
  const fee = index === 0 ? BigInt(tx.meta?.fee ?? 0) : 0n;
  return BigInt(post) - BigInt(pre) + fee;
}

const asNumber = ({ raw, decimals }: Delta) => Number(raw) / 10 ** decimals;

// One Jupiter swap from the wallet's own transaction, the same way the web route reads it: the biggest balance that fell is
// what was sold, the biggest that rose is what was bought.
export function decodeSpotSwap({ tx, signature, blockTime }: WalletTransaction, wallet: string): SpotSwap | null {
  if (!tx.meta?.logMessages?.some((line) => line.includes(JUPITER_PROGRAM))) return null;
  const deltas = tokenDeltas(tx, wallet);
  const native = nativeSolDelta(tx, wallet);
  if (native !== null && (native > DUST_LAMPORTS || native < -DUST_LAMPORTS)) {
    deltas.set(NATIVE_SOL_MINT, { raw: (deltas.get(NATIVE_SOL_MINT)?.raw ?? 0n) + native, decimals: LAMPORT_DECIMALS });
  }

  let spent: [string, Delta] | null = null;
  let received: [string, Delta] | null = null;
  for (const entry of deltas) {
    if (entry[1].raw < 0n && (spent === null || asNumber(entry[1]) < asNumber(spent[1]))) spent = entry;
    if (entry[1].raw > 0n && (received === null || asNumber(entry[1]) > asNumber(received[1]))) received = entry;
  }
  const from = spent && assetByMint.get(spent[0]);
  const to = received && assetByMint.get(received[0]);
  if (!spent || !received || !from || !to) return null;

  return {
    signature,
    timestamp: blockTime * 1000,
    from: from.symbol,
    to: to.symbol,
    amountIn: -spent[1].raw,
    decimalsIn: spent[1].decimals,
    amountOut: received[1].raw,
    decimalsOut: received[1].decimals,
  };
}

// The web route's rows, plus the swaps it drops because it cannot name one side (SKR, which the website does not carry),
// read from the wallet's own transactions. A signature the route already reported is never listed twice.
export function withAppOnlySwaps(hosted: readonly SpotSwap[], transactions: readonly WalletTransaction[], wallet: string): SpotSwap[] {
  const known = new Set(hosted.map((swap) => swap.signature));
  const extra = succeededOnly(transactions).flatMap((transaction) => {
    const swap = decodeSpotSwap(transaction, wallet);
    return swap && !known.has(swap.signature) && (APP_ONLY_ASSETS.has(swap.from) || APP_ONLY_ASSETS.has(swap.to)) ? [swap] : [];
  });
  return [...hosted, ...extra].sort((a, b) => b.timestamp - a.timestamp);
}

export async function fetchSpotSwaps(connection: Connection, wallet: string, signal?: AbortSignal): Promise<SpotSwap[]> {
  const [hosted, transactions] = await Promise.all([
    requestJson(`${API_BASE_URL}/api/solana/spot-history?address=${wallet}`, { signal }).then(spotSwapsFromPayload),
    // The web route's rows still show if the wallet's own history cannot be read.
    fetchWalletTransactions(connection, wallet).catch(() => []),
  ]);
  return withAppOnlySwaps(hosted, transactions, wallet);
}
