import type { ParsedTransactionWithMeta } from "@solana/web3.js";

import { type AssetSymbol, assetByMint, NATIVE_SOL_MINT } from "./assets";
import type { WalletTransaction } from "./wallet-transactions";

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

export function spotSwapsFrom(transactions: readonly WalletTransaction[], wallet: string): SpotSwap[] {
  return transactions.flatMap((transaction) => decodeSpotSwap(transaction, wallet) ?? []).sort((a, b) => b.timestamp - a.timestamp);
}
