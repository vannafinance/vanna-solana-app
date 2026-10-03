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
  // Lookup tables that exist on mainnet. A wallet reads them like any other account, unlike a table made on the fork, and
  // they let more of the batches share one transaction.
  tables?: readonly AddressLookupTableAccount[];
  // Called after each transaction lands with how many batches have landed so far in this call.
  onLanded?: (batches: number) => void;
};

type Packed = { instructions: TransactionInstruction[]; batches: number };

function fits(payer: PublicKey, instructions: TransactionInstruction[], tables: readonly AddressLookupTableAccount[]): boolean {
  try {
    const message = new TransactionMessage({ payerKey: payer, recentBlockhash: SIZING_BLOCKHASH, instructions }).compileToV0Message([...tables]);
    return new VersionedTransaction(message).serialize().length <= MAX_TRANSACTION_BYTES;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

function pack(payer: PublicKey, { computeUnits, batches }: BatchRequest, tables: readonly AddressLookupTableAccount[]): Packed[] {
  const budget = ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits });
  const transactions: Packed[] = [];
  for (const batch of batches) {
    const last = transactions[transactions.length - 1];
    if (last !== undefined && fits(payer, [...last.instructions, ...batch], tables)) {
      last.instructions.push(...batch);
      last.batches += 1;
    } else if (fits(payer, [budget, ...batch], tables)) transactions.push({ instructions: [budget, ...batch], batches: 1 });
    else throw new RangeError("This action is too large to send in one transaction");
  }
  return transactions;
}

// The wallet's own security check reads every transaction against real mainnet, so a transaction that points at an address
// lookup table made on the fork cannot be read and some wallets refuse to sign it. This packs the batches into as few
// transactions as fit, using only tables that exist on mainnet, approves them together in one prompt and sends them in
// order, each after the one before has confirmed. One that fits goes out as it is.
export async function sendBatches(connection: Connection, payer: PublicKey, request: BatchRequest, hooks: SigningHooks): Promise<string> {
  const tables = request.tables ?? [];
  const transactions = pack(payer, request, tables);
  if (transactions.length === 0) throw new RangeError("There is nothing left to send");
  if (transactions.length === 1) {
    const signature = await sendInstructions(connection, payer, transactions[0].instructions, hooks, [...tables]);
    request.onLanded?.(transactions[0].batches);
    return signature;
  }

  const latest = await connection.getLatestBlockhash("confirmed");
  const unsigned = transactions.map(
    ({ instructions }) => new VersionedTransaction(new TransactionMessage({ payerKey: payer, recentBlockhash: latest.blockhash, instructions }).compileToV0Message([...tables])),
  );
  // Only the first can be checked now; the others read what the first leaves behind.
  const simulation = await connection.simulateTransaction(unsigned[0], { sigVerify: false, commitment: "confirmed" });
  if (simulation.value.err) throw new TransactionFailedError(`${JSON.stringify(simulation.value.err)} ${simulation.value.logs?.join(" ") ?? ""}`);

  hooks.onPrepared?.();
  const signed = await hooks.signAll(unsigned);
  hooks.onSigned();

  let signature = "";
  let landed = 0;
  for (let index = 0; index < signed.length; index++) {
    const isLast = index === signed.length - 1;
    try {
      signature = await sendAndConfirm(connection, signed[index], latest.lastValidBlockHeight, isLast ? hooks : {});
      landed += transactions[index].batches;
      request.onLanded?.(landed);
    } catch (error) {
      if (index > 0 && !request.retrySafe) throw new PartialSendError(index, error);
      throw error;
    }
  }
  return signature;
}
