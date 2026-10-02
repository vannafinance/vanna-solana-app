import {
  AddressLookupTableProgram,
  type AddressLookupTableAccount,
  type Connection,
  type PublicKey,
  type TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { sendAndConfirm, type SigningHooks, sendInstructions } from "./send-transaction";

const MAX_TRANSACTION_BYTES = 1232;
// Create and the first extend share one transaction; every later extend is its own, and each must see the one before it.
const ADDRESSES_PER_EXTEND = 25;
const TABLE_READY_ATTEMPTS = 40;
const POLL_MS = 350;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fitsInOnePacket(connection: Connection, payer: PublicKey, instructions: TransactionInstruction[]): Promise<boolean> {
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  try {
    const message = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions }).compileToV0Message();
    return new VersionedTransaction(message).serialize().length <= MAX_TRANSACTION_BYTES;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

function distinctAccounts(payer: PublicKey, instructions: TransactionInstruction[]): PublicKey[] {
  const seen = new Set([payer.toBase58()]);
  const accounts: PublicKey[] = [];
  for (const instruction of instructions) {
    for (const key of [instruction.programId, ...instruction.keys.map((meta) => meta.pubkey)]) {
      if (seen.has(key.toBase58())) continue;
      seen.add(key.toBase58());
      accounts.push(key);
    }
  }
  return accounts;
}

// An address lookup table replaces each 32 byte account in the transaction with a one byte index. It is created and
// filled in transactions signed together, so the wallet shows one prompt for the whole preparation. A table cannot be
// used in the slot it was created, so this waits for the next one.
async function createLookupTable(connection: Connection, payer: PublicKey, addresses: PublicKey[], hooks: SigningHooks): Promise<AddressLookupTableAccount> {
  const slot = await connection.getSlot("finalized");
  const [create, table] = AddressLookupTableProgram.createLookupTable({ authority: payer, payer, recentSlot: Math.max(0, slot - 1) });
  const extensions = [];
  for (let start = 0; start < addresses.length; start += ADDRESSES_PER_EXTEND) {
    extensions.push(AddressLookupTableProgram.extendLookupTable({ payer, authority: payer, lookupTable: table, addresses: addresses.slice(start, start + ADDRESSES_PER_EXTEND) }));
  }
  const groups = [[create, extensions[0]], ...extensions.slice(1).map((instruction) => [instruction])];

  const latest = await connection.getLatestBlockhash("confirmed");
  const unsigned = groups.map((group) => new VersionedTransaction(new TransactionMessage({ payerKey: payer, recentBlockhash: latest.blockhash, instructions: group }).compileToV0Message()));
  const signed = await hooks.signAll(unsigned);
  for (const transaction of signed) await sendAndConfirm(connection, transaction, latest.lastValidBlockHeight);

  const createdAt = await connection.getSlot("confirmed");
  for (let attempt = 0; attempt < TABLE_READY_ATTEMPTS; attempt++) {
    if ((await connection.getSlot("confirmed")) > createdAt) {
      const { value } = await connection.getAddressLookupTable(table);
      if (value !== null && value.state.addresses.length >= addresses.length) return value;
    }
    await sleep(POLL_MS);
  }
  throw new Error("The lookup table was not ready in time. Nothing else was sent.");
}

// A transaction that fits one packet goes out as it is, with a single approval. One that does not gets a temporary
// lookup table first, which costs one extra approval and a few hundredths of a cent in rent.
export async function sendLargeInstructions(connection: Connection, payer: PublicKey, instructions: TransactionInstruction[], hooks: SigningHooks): Promise<string> {
  if (await fitsInOnePacket(connection, payer, instructions)) return sendInstructions(connection, payer, instructions, hooks);
  const table = await createLookupTable(connection, payer, distinctAccounts(payer, instructions), hooks);
  return sendInstructions(connection, payer, instructions, hooks, [table]);
}
