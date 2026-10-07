import { type AddressLookupTableAccount, ComputeBudgetProgram, type Connection, type PublicKey, type TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

import { freshenForkOracles } from "./fork-oracles";
import { healStaleDexPools } from "./heal-pools";
import { createTemporaryTable, distinctAccounts } from "./lookup-tables";
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

// The wallet declined to sign while this order depended on a lookup table that only exists on the fork. Wallets such as Solflare
// check every transaction against real mainnet, cannot read that table and refuse, so the user needs a different way out than
// "try again".
export class ForkTableSigningError extends Error {
  constructor(readonly reason: unknown) {
    super("The wallet did not sign an order that needs a temporary account on the fork.");
    this.name = "ForkTableSigningError";
  }
}

// Errors from signing, while the order depends on a fork table, are marked so they can be explained.
function guardSigning(hooks: SigningHooks): SigningHooks {
  const wrap = <T,>(call: () => Promise<T>) => call().catch((error: unknown) => {
    throw new ForkTableSigningError(error);
  });
  return { ...hooks, sign: (transaction) => wrap(() => hooks.sign(transaction)), signAll: (transactions) => wrap(() => hooks.signAll(transactions)) };
}

export type BatchRequest = {
  computeUnits: number;
  // Instructions that must stay together in one transaction, in order. Neighbouring batches share a transaction when they fit.
  batches: readonly (readonly TransactionInstruction[])[];
  // Per batch, whether it is light enough to run on Solana's default compute allowance (200,000 units per instruction), so it
  // may go without the compute budget instruction when that is what keeps it in one transaction. A deposit, a borrow or a
  // Kamino supply is; a margin swap is not (it uses 300,000 or more). Unset means none.
  lightBatches?: readonly boolean[];
  // True when running the earlier batches again is harmless, so a failure after they landed is just the failure.
  retrySafe: boolean;
  // Lookup tables that exist on mainnet. A wallet reads them like any other account, unlike a table made on the fork, and
  // they let more of the batches share one transaction.
  tables?: readonly AddressLookupTableAccount[];
  // When the batches still cannot be packed with those, a table made on the fork is the last resort: one extra wallet
  // prompt, and a warning in some wallets (Solflare refuses it). Without it such an order is reported as too large.
  allowForkTable?: boolean;
  // Called after each transaction lands with how many batches have landed so far in this call.
  onLanded?: (batches: number) => void;
};

type Packed = { instructions: TransactionInstruction[]; batches: number };

// Whether these instructions fit one transaction with these lookup tables, as they would be sent (without a compute budget).
export function fitsOneTransaction(payer: PublicKey, instructions: TransactionInstruction[], tables: readonly AddressLookupTableAccount[]): boolean {
  return fits(payer, instructions, tables);
}

function fits(payer: PublicKey, instructions: TransactionInstruction[], tables: readonly AddressLookupTableAccount[]): boolean {
  try {
    const message = new TransactionMessage({ payerKey: payer, recentBlockhash: SIZING_BLOCKHASH, instructions }).compileToV0Message([...tables]);
    return new VersionedTransaction(message).serialize().length <= MAX_TRANSACTION_BYTES;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

function pack(payer: PublicKey, { computeUnits, batches, lightBatches }: BatchRequest, tables: readonly AddressLookupTableAccount[]): Packed[] {
  const budget = ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits });
  const transactions: Packed[] = [];
  for (const [index, batch] of batches.entries()) {
    const last = transactions[transactions.length - 1];
    if (last !== undefined && fits(payer, [...last.instructions, ...batch], tables)) {
      last.instructions.push(...batch);
      last.batches += 1;
    } else if (fits(payer, [budget, ...batch], tables)) transactions.push({ instructions: [budget, ...batch], batches: 1 });
    // The compute budget instruction costs about 40 bytes. A light batch a few bytes over the limit with it (a borrow on an
    // account with many positions lists every one of them) goes without it, rather than needing a lookup table made on the fork.
    else if (lightBatches?.[index] === true && fits(payer, [...batch], tables)) transactions.push({ instructions: [...batch], batches: 1 });
    else throw new RangeError("This action is too large to send in one transaction");
  }
  return transactions;
}

// The wallet's own security check reads every transaction against real mainnet, so a transaction that points at an address
// lookup table made on the fork cannot be read and some wallets refuse to sign it. This packs the batches into as few
// transactions as fit, using only tables that exist on mainnet, approves them together in one prompt and sends them in
// order, each after the one before has confirmed. One that fits goes out as it is.
export async function sendBatches(connection: Connection, payer: PublicKey, request: BatchRequest, hooks: SigningHooks): Promise<string> {
  let signing = hooks;
  let tables = request.tables ?? [];
  let transactions: Packed[];
  try {
    transactions = pack(payer, request, tables);
  } catch (error) {
    if (!(error instanceof RangeError) || request.allowForkTable !== true) throw error;
    const table = await createTemporaryTable(connection, payer, distinctAccounts(payer, request.batches.flat()), guardSigning(hooks));
    tables = [...tables, table];
    signing = guardSigning(hooks);
    transactions = pack(payer, request, tables);
  }
  if (transactions.length === 0) throw new RangeError("There is nothing left to send");
  if (transactions.length === 1) {
    const signature = await sendInstructions(connection, payer, transactions[0].instructions, signing, [...tables]);
    request.onLanded?.(transactions[0].batches);
    return signature;
  }

  const latest = await connection.getLatestBlockhash("confirmed");
  const unsigned = transactions.map(
    ({ instructions }) => new VersionedTransaction(new TransactionMessage({ payerKey: payer, recentBlockhash: latest.blockhash, instructions }).compileToV0Message([...tables])),
  );
  // Only the first can be checked now; the others read what the first leaves behind. So every pool the order swaps
  // through is re-cloned up front, as a single transaction does after a failed simulation, and every stale price rewritten.
  await Promise.all([freshenForkOracles(connection), ...unsigned.map((transaction) => healStaleDexPools(connection, transaction))]);
  const simulation = await connection.simulateTransaction(unsigned[0], { sigVerify: false, commitment: "confirmed" });
  if (simulation.value.err) throw new TransactionFailedError(`${JSON.stringify(simulation.value.err)} ${simulation.value.logs?.join(" ") ?? ""}`);

  signing.onPrepared?.();
  const signed = await signing.signAll(unsigned);
  signing.onSigned();

  let signature = "";
  let landed = 0;
  for (let index = 0; index < signed.length; index++) {
    const isLast = index === signed.length - 1;
    try {
      signature = await sendAndConfirm(connection, signed[index], latest.lastValidBlockHeight, isLast ? signing : {});
      landed += transactions[index].batches;
      request.onLanded?.(landed);
    } catch (error) {
      if (index > 0 && !request.retrySafe) throw new PartialSendError(index, error);
      throw error;
    }
  }
  return signature;
}
