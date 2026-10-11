import { type Connection, type ParsedInstruction, type ParsedTransactionWithMeta, type PartiallyDecodedInstruction, PublicKey } from "@solana/web3.js";

import { failureReason } from "@/lib/farm/failure-reason";

import { APP_ONLY_ASSETS, type AssetSymbol, assetByMint } from "./assets";
import { decodeBase58 } from "./base58";
import { API_BASE_URL, VANNA_PROGRAM_ID } from "./config";
import { assetOf, baseUnits, rowsOf } from "./history-rows";
import { requestJson } from "./request-json";
import { fetchWalletTransactions, succeededOnly, type WalletTransaction } from "./wallet-transactions";

export type EarnEvent = {
  kind: "supply" | "withdraw";
  symbol: AssetSymbol;
  amount: bigint | null;
  signature: string;
  timestamp: number;
  // A failed supply or withdrawal moved nothing; it is listed in history but never counted.
  status: "succeeded" | "failed";
  reason: string | null;
};

// Supplies and withdrawals as the web app's own history route reports them, so both apps show the same rows.
export function earnEventsFromPayload(payload: unknown): EarnEvent[] {
  return rowsOf(payload)
    .flatMap((row): EarnEvent[] => {
      const asset = assetOf(row.asset);
      const kind = row.type === "supply" || row.type === "withdraw" ? row.type : null;
      const failed = row.status !== undefined && row.status !== "success";
      if (!asset || !kind || typeof row.hash !== "string" || typeof row.timestamp !== "number") return [];
      return [{ kind, symbol: asset.symbol, amount: baseUnits(row.amount, asset.decimals), signature: row.hash, timestamp: row.timestamp, status: failed ? "failed" : "succeeded", reason: null }];
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

const SUPPLY = [52, 247, 77, 250, 74, 122, 100, 33];
const REDEEM = [22, 48, 40, 70, 164, 48, 75, 224];
const UNDERLYING_MINT_INDEX = 4;
const LENDER_TOKEN_ACCOUNT_INDEX = 5;

const matches = (data: Uint8Array, discriminator: readonly number[]) => discriminator.every((byte, index) => data[index] === byte);

function isRaw(instruction: ParsedInstruction | PartiallyDecodedInstruction): instruction is PartiallyDecodedInstruction {
  return "data" in instruction;
}

function readU64(data: Uint8Array, offset: number): bigint {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(offset, true);
}

function tokenBalanceChange(tx: ParsedTransactionWithMeta, account: PublicKey): bigint | null {
  const index = tx.transaction.message.accountKeys.findIndex((key) => key.pubkey.equals(account));
  if (index < 0 || !tx.meta) return null;
  const pre = tx.meta.preTokenBalances?.find((balance) => balance.accountIndex === index);
  const post = tx.meta.postTokenBalances?.find((balance) => balance.accountIndex === index);
  if (!pre || !post) return null;
  return BigInt(post.uiTokenAmount.amount) - BigInt(pre.uiTokenAmount.amount);
}

// Supplies and withdrawals from the wallet's own transaction: the Vanna supply and redeem instructions and the mint they
// name. A failed one keeps the amount it tried to supply; a failed withdrawal paid nothing, so its size is unknown. The fork
// reports a truncated blockTime on getTransaction, so the time comes from the signature list.
export function decodeEarnEvents({ tx, signature, blockTime }: WalletTransaction): EarnEvent[] {
  const failed = Boolean(tx.meta?.err);
  const reason = failed && tx.meta ? failureReason(tx.meta) : null;
  const events: EarnEvent[] = [];
  for (const instruction of tx.transaction.message.instructions) {
    if (!isRaw(instruction) || instruction.programId.toBase58() !== VANNA_PROGRAM_ID) continue;
    const data = decodeBase58(instruction.data);
    if (!data || data.byteLength < 16) continue;
    const kind = matches(data, SUPPLY) ? "supply" : matches(data, REDEEM) ? "withdraw" : null;
    const mint = instruction.accounts[UNDERLYING_MINT_INDEX];
    const asset = kind && mint ? assetByMint.get(mint.toBase58()) : undefined;
    if (!kind || !asset) continue;

    // Redeem carries vault shares, not assets; the real payout is the change in the lender's token account.
    let amount: bigint | null = readU64(data, 8);
    if (kind === "withdraw") {
      const change = failed ? null : tokenBalanceChange(tx, instruction.accounts[LENDER_TOKEN_ACCOUNT_INDEX]);
      amount = change !== null && change > 0n ? change : null;
    }
    events.push({ kind, symbol: asset.symbol, amount, signature, timestamp: blockTime * 1000, status: failed ? "failed" : "succeeded", reason });
  }
  return events;
}

// The web route's rows, plus what it leaves out, read from the wallet's own transactions: supplies and withdrawals of an
// asset it cannot name (SKR, which the website does not carry) and every one that failed, which the route skips. A
// signature the route already reported is never listed twice.
export function withDeviceEarnEvents(hosted: readonly EarnEvent[], transactions: readonly WalletTransaction[]): EarnEvent[] {
  const known = new Set(hosted.map((event) => event.signature));
  const appOnly = succeededOnly(transactions).flatMap((transaction) =>
    decodeEarnEvents(transaction).filter((event) => !known.has(event.signature) && APP_ONLY_ASSETS.has(event.symbol)),
  );
  const failed = transactions.flatMap((transaction) => (transaction.status === "failed" && !known.has(transaction.signature) ? decodeEarnEvents(transaction) : []));
  return [...hosted, ...appOnly, ...failed].sort((a, b) => b.timestamp - a.timestamp);
}

// What really moved: the supplies and withdrawals that went through. Every figure built from history starts here.
export const succeededEarnEvents = (events: readonly EarnEvent[]) => events.filter((event) => event.status !== "failed");

export async function fetchEarnEvents(connection: Connection, wallet: string, signal?: AbortSignal): Promise<EarnEvent[]> {
  const [hosted, transactions] = await Promise.all([
    requestJson(`${API_BASE_URL}/api/solana/history?kind=earn&address=${wallet}`, { signal }).then(earnEventsFromPayload),
    // The web route's rows still show if the wallet's own history cannot be read.
    fetchWalletTransactions(connection, wallet).catch(() => []),
  ]);
  return withDeviceEarnEvents(hosted, transactions);
}
