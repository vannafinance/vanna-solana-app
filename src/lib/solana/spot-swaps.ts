import type { Connection, ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction } from "@solana/web3.js";

import { failureReason } from "@/lib/farm/failure-reason";

import { APP_ONLY_ASSETS, type AssetSymbol, assetByMint, NATIVE_SOL_MINT } from "./assets";
import { decodeBase58 } from "./base58";
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
  // A failed swap landed on the chain but moved nothing: its amounts are what it tried to sell and was quoted to receive.
  status: "succeeded" | "failed";
  // Why a failed swap failed, in a few words, when the chain says.
  reason: string | null;
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
      return [{ signature: row.hash, timestamp: row.timestamp, from: from.symbol, to: to.symbol, amountIn, decimalsIn: from.decimals, amountOut, decimalsOut: to.decimals, status: "succeeded", reason: null }];
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
    status: "succeeded",
    reason: null,
  };
}

// Jupiter's exact-in swap instructions. Both end with in_amount (u64), quoted_out_amount (u64), slippage_bps (u16) and
// platform_fee_bps (u8), after a route plan of varying length, so the amounts are read from the end.
const ROUTE = [229, 23, 203, 151, 122, 227, 173, 42];
const SHARED_ACCOUNTS_ROUTE = [193, 32, 155, 51, 65, 214, 156, 129];
const AMOUNTS_TAIL = 19;

function isRaw(instruction: ParsedInstruction | PartiallyDecodedInstruction): instruction is PartiallyDecodedInstruction {
  return "data" in instruction;
}

const startsWith = (data: Uint8Array, discriminator: readonly number[]) => discriminator.every((byte, index) => data[index] === byte);

// A swap that failed moved no balances, so what it tried to do is read from the Jupiter instruction itself: the token
// account it sold from (its mint from the transaction's token balances) or the source mint it names, the mint it bought
// and the amounts. Only exact-in routes are read; that is what the app and the web app send.
export function decodeFailedSpotSwap({ tx, signature, blockTime }: WalletTransaction): SpotSwap | null {
  if (!tx.meta?.err) return null;
  const mintAt = (account: { toBase58(): string }) => {
    const index = tx.transaction.message.accountKeys.findIndex((key) => key.pubkey.toBase58() === account.toBase58());
    return [...(tx.meta?.preTokenBalances ?? []), ...(tx.meta?.postTokenBalances ?? [])].find((balance) => balance.accountIndex === index)?.mint;
  };
  for (const instruction of tx.transaction.message.instructions) {
    if (!isRaw(instruction) || instruction.programId.toBase58() !== JUPITER_PROGRAM) continue;
    const data = decodeBase58(instruction.data);
    if (data === null || data.byteLength < 8 + AMOUNTS_TAIL) continue;
    const accounts = instruction.accounts;
    const shared = startsWith(data, SHARED_ACCOUNTS_ROUTE);
    if (!shared && !startsWith(data, ROUTE)) continue;
    const fromMint = shared ? accounts[7]?.toBase58() : accounts[2] && mintAt(accounts[2]);
    const toMint = shared ? accounts[8]?.toBase58() : accounts[5]?.toBase58();
    const from = fromMint === undefined ? undefined : assetByMint.get(fromMint);
    const to = toMint === undefined ? undefined : assetByMint.get(toMint);
    if (!from || !to) continue;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const tail = data.byteLength - AMOUNTS_TAIL;
    return {
      signature,
      timestamp: blockTime * 1000,
      from: from.symbol,
      to: to.symbol,
      amountIn: view.getBigUint64(tail, true),
      decimalsIn: from.decimals,
      amountOut: view.getBigUint64(tail + 8, true),
      decimalsOut: to.decimals,
      status: "failed",
      reason: failureReason(tx.meta),
    };
  }
  return null;
}

// The web route's rows, plus what it leaves out, read from the wallet's own transactions: swaps it cannot name one side of
// (SKR, which the website does not carry) and every swap that failed, which the route skips. A signature the route already
// reported is never listed twice.
export function withDeviceSwaps(hosted: readonly SpotSwap[], transactions: readonly WalletTransaction[], wallet: string): SpotSwap[] {
  const known = new Set(hosted.map((swap) => swap.signature));
  const appOnly = succeededOnly(transactions).flatMap((transaction) => {
    const swap = decodeSpotSwap(transaction, wallet);
    return swap && !known.has(swap.signature) && (APP_ONLY_ASSETS.has(swap.from) || APP_ONLY_ASSETS.has(swap.to)) ? [swap] : [];
  });
  const failed = transactions.flatMap((transaction) => {
    if (transaction.status !== "failed" || known.has(transaction.signature)) return [];
    const swap = decodeFailedSpotSwap(transaction);
    return swap === null ? [] : [swap];
  });
  return [...hosted, ...appOnly, ...failed].sort((a, b) => b.timestamp - a.timestamp);
}

export async function fetchSpotSwaps(connection: Connection, wallet: string, signal?: AbortSignal): Promise<SpotSwap[]> {
  const [hosted, transactions] = await Promise.all([
    requestJson(`${API_BASE_URL}/api/solana/spot-history?address=${wallet}`, { signal }).then(spotSwapsFromPayload),
    // The web route's rows still show if the wallet's own history cannot be read.
    fetchWalletTransactions(connection, wallet).catch(() => []),
  ]);
  return withDeviceSwaps(hosted, transactions, wallet);
}
