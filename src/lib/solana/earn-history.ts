import type { Connection, ParsedTransactionWithMeta, PartiallyDecodedInstruction, ParsedInstruction } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";

import { type AssetSymbol, assetByMint } from "./assets";
import { VANNA_PROGRAM_ID } from "./config";
import { decodeBase58 } from "./base58";
import { ApiError } from "./request-json";

export type EarnEvent = {
  kind: "supply" | "withdraw";
  symbol: AssetSymbol;
  amount: bigint | null;
  signature: string;
  timestamp: number;
};

const SUPPLY = [52, 247, 77, 250, 74, 122, 100, 33];
const REDEEM = [22, 48, 40, 70, 164, 48, 75, 224];
const UNDERLYING_MINT_INDEX = 4;
const LENDER_TOKEN_ACCOUNT_INDEX = 5;

const PAGE_SIZE = 1000;
const CONCURRENCY = 8;
export const DEFAULT_MAX_SIGNATURES = 1000;

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

// The fork reports a truncated blockTime on getTransaction, so the time comes from the signature list.
export function decodeEarnEvents(tx: ParsedTransactionWithMeta, signature: string, blockTimeSeconds: number): EarnEvent[] {
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
    events.push({ kind, symbol: asset.symbol, amount, signature, timestamp: blockTimeSeconds * 1000 });
  }
  return events;
}

// Newest first. Failed transactions are dropped before they are fetched.
export async function fetchEarnEvents(connection: Connection, wallet: string, maxSignatures = DEFAULT_MAX_SIGNATURES): Promise<EarnEvent[]> {
  const owner = new PublicKey(wallet);
  const signatures: { signature: string; blockTime: number }[] = [];
  let before: string | undefined;

  try {
    while (signatures.length < maxSignatures) {
      const page = await connection.getSignaturesForAddress(owner, { limit: Math.min(PAGE_SIZE, maxSignatures - signatures.length), before }, "confirmed");
      signatures.push(...page.filter((entry) => !entry.err).map((entry) => ({ signature: entry.signature, blockTime: entry.blockTime ?? 0 })));
      if (page.length < PAGE_SIZE) break;
      before = page[page.length - 1].signature;
    }

    const events: EarnEvent[] = [];
    for (let i = 0; i < signatures.length; i += CONCURRENCY) {
      const batch = await Promise.all(
        signatures.slice(i, i + CONCURRENCY).map((entry) =>
          connection.getParsedTransaction(entry.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }).then((tx) => ({ tx, ...entry })),
        ),
      );
      for (const { tx, signature, blockTime } of batch) if (tx) events.push(...decodeEarnEvents(tx, signature, blockTime));
    }
    return events.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    throw new ApiError("network");
  }
}
