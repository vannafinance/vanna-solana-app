import { type AddressLookupTableAccount, ComputeBudgetProgram, type Connection, type PublicKey, type TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

import { sendAndConfirm, type SigningHooks, sendInstructions, TransactionFailedError } from "./send-transaction";

const MAX_TRANSACTION_BYTES = 1232;
// Packing only needs the size of a message, and any blockhash is 32 bytes.
const SIZING_BLOCKHASH = "11111111111111111111111111111111";

// Some of the transactions landed and a later one did not.
export class PartialSendError extends Error {
  constructor(
    readonly landed: number,
    readonly reason: unknown,
  ) {
    super("Part of this action went through before it stopped.");
    this.name = "PartialSendError";
  }
}

export type BatchRequest = {
  computeUnits: number;
  // Instructions that must stay together in one transaction, in order. Neighbouring batches share a transaction when they fit.
  batches: readonly (readonly TransactionInstruction[])[];
  // True when running the earlier batches again is harmless, so a failure after they landed is just the failure.
  retrySafe: boolean;
  // Lookup tables that exist on mainnet, used only when the batches do not fit without them. A wallet reads them like any
  // other account, unlike a table made on the fork.
  tables?: readonly AddressLookupTableAccount[];
};

function fits(payer: PublicKey, instructions: TransactionInstruction[], tables: readonly AddressLookupTableAccount[]): boolean {
  try {
    const message = new TransactionMessage({ payerKey: payer, recentBlockhash: SIZING_BLOCKHASH, instructions }).compileToV0Message([...tables]);
    return new VersionedTransaction(message).serialize().length <= MAX_TRANSACTION_BYTES;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

function pack(payer: PublicKey, { computeUnits, batches }: BatchRequest, tables: readonly AddressLookupTableAccount[]): TransactionInstruction[][] {
  const budget = ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits });
  const transactions: TransactionInstruction[][] = [];
  for (const batch of batches) {
    const last = transactions[transactions.length - 1];
    if (last !== undefined && fits(payer, [...last, ...batch], tables)) last.push(...batch);
    else if (fits(payer, [budget, ...batch], tables)) transactions.push([budget, ...batch]);
    else throw new RangeError("This action is too large to send in one transaction");
  }
  return transactions;
}

function packWithFallback(payer: PublicKey, request: BatchRequest): { transactions: TransactionInstruction[][]; tables: readonly AddressLookupTableAccount[] } {
  try {
    return { transactions: pack(payer, request, []), tables: [] };
  } catch (error) {
    const tables = request.tables ?? [];
    if (!(error instanceof RangeError) || tables.length === 0) throw error;
    return { transactions: pack(payer, request, tables), tables };
  }
}

// The wallet's own security check reads every transaction against real mainnet, so a transaction that points at an address
// lookup table made on the fork cannot be read and some wallets refuse to sign it. This sends what does not fit in one
// transaction as several plain ones instead, approved together in one prompt and sent in order, each after the one before
// has confirmed. One that fits goes out as it is.
export async function sendBatches(connection: Connection, payer: PublicKey, request: BatchRequest, hooks: SigningHooks): Promise<string> {
  const { transactions, tables } = packWithFallback(payer, request);
  if (transactions.length === 1) return sendInstructions(connection, payer, transactions[0], hooks, [...tables]);

  const latest = await connection.getLatestBlockhash("confirmed");
  const unsigned = transactions.map(
    (instructions) => new VersionedTransaction(new TransactionMessage({ payerKey: payer, recentBlockhash: latest.blockhash, instructions }).compileToV0Message([...tables])),
  );
  // Only the first can be checked now; the others read what the first leaves behind.
  const simulation = await connection.simulateTransaction(unsigned[0], { sigVerify: false, commitment: "confirmed" });
  if (simulation.value.err) throw new TransactionFailedError(`${JSON.stringify(simulation.value.err)} ${simulation.value.logs?.join(" ") ?? ""}`);

  hooks.onPrepared?.();
  const signed = await hooks.signAll(unsigned);
  hooks.onSigned();

  let signature = "";
  for (let index = 0; index < signed.length; index++) {
    const isLast = index === signed.length - 1;
    try {
      signature = await sendAndConfirm(connection, signed[index], latest.lastValidBlockHeight, isLast ? hooks : {});
    } catch (error) {
      if (index > 0 && !request.retrySafe) throw new PartialSendError(index, error);
      throw error;
    }
  }
  return signature;
}
