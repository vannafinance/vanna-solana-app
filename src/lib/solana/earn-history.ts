import { type Connection, type ParsedInstruction, type ParsedTransactionWithMeta, type PartiallyDecodedInstruction, PublicKey } from "@solana/web3.js";

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
// name. The fork reports a truncated blockTime on getTransaction, so the time comes from the signature list.
export function decodeEarnEvents({ tx, signature, blockTime }: WalletTransaction): EarnEvent[] {
  if (tx.meta?.err) return [];
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
      const change = tokenBalanceChange(tx, instruction.accounts[LENDER_TOKEN_ACCOUNT_INDEX]);
      amount = change !== null && change > 0n ? change : null;
    }
    events.push({ kind, symbol: asset.symbol, amount, signature, timestamp: blockTime * 1000 });
  }
  return events;
}

// The web route's rows, plus the supplies and withdrawals it drops because it cannot name the asset (SKR, which the website
// does not carry), read from the wallet's own transactions. A signature the route already reported is never listed twice.
export function withAppOnlyEarnEvents(hosted: readonly EarnEvent[], transactions: readonly WalletTransaction[]): EarnEvent[] {
  const known = new Set(hosted.map((event) => event.signature));
  const extra = succeededOnly(transactions).flatMap((transaction) =>
    decodeEarnEvents(transaction).filter((event) => !known.has(event.signature) && APP_ONLY_ASSETS.has(event.symbol)),
  );
  return [...hosted, ...extra].sort((a, b) => b.timestamp - a.timestamp);
}

export async function fetchEarnEvents(connection: Connection, wallet: string, signal?: AbortSignal): Promise<EarnEvent[]> {
  const [hosted, transactions] = await Promise.all([
    requestJson(`${API_BASE_URL}/api/solana/history?kind=earn&address=${wallet}`, { signal }).then(earnEventsFromPayload),
    // The web route's rows still show if the wallet's own history cannot be read.
    fetchWalletTransactions(connection, wallet).catch(() => []),
  ]);
  return withAppOnlyEarnEvents(hosted, transactions);
}
