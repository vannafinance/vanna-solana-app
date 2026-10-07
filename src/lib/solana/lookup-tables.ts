import {
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  type Connection,
  type PublicKey,
  type TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { sendAndConfirm, type SigningHooks } from "./send-transaction";

// Create and the first extend share one transaction; every later extend is its own, and each must see the one before it.
const ADDRESSES_PER_EXTEND = 25;
const TABLE_READY_ATTEMPTS = 40;
const POLL_MS = 350;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Tables that cannot be read are left out: a transaction built without one is larger, not wrong.
//
// Addresses added in a table's latest extend are usable only after the slot of that extend. The fork copies mainnet tables
// but its own slot counter runs well behind mainnet's, so a recent extend's addresses stay unusable there and a transaction
// that indexes them fails with "invalid index". Only the addresses the connected network already accepts are offered; the
// rest are written in full, which is larger but always valid.
export async function fetchLookupTables(connection: Connection, addresses: readonly PublicKey[]): Promise<AddressLookupTableAccount[]> {
  const [found, slot] = await Promise.all([Promise.all(addresses.map(async (address) => (await connection.getAddressLookupTable(address)).value)), connection.getSlot("confirmed")]);
  return found.filter((table): table is AddressLookupTableAccount => table !== null).map((table) => usableNow(table, slot));
}

function usableNow(table: AddressLookupTableAccount, slot: number): AddressLookupTableAccount {
  const { state } = table;
  if (slot > state.lastExtendedSlot || state.lastExtendedSlotStartIndex >= state.addresses.length) return table;
  return new AddressLookupTableAccount({ key: table.key, state: { ...state, addresses: state.addresses.slice(0, state.lastExtendedSlotStartIndex) } });
}

export function distinctAccounts(payer: PublicKey, instructions: readonly TransactionInstruction[]): PublicKey[] {
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

// An address lookup table replaces each 32 byte account in a transaction with a one byte index. This one is made on the
// fork, which no wallet can read on mainnet, so some wallets warn about a transaction that uses it and Solflare refuses it.
// It is therefore the last resort for an order that cannot be made to fit any other way. It is created and filled in
// transactions signed together, so the wallet shows one prompt for the whole preparation, and a table cannot be used in the
// slot it was created, so this waits for the next one.
export async function createTemporaryTable(connection: Connection, payer: PublicKey, addresses: PublicKey[], hooks: SigningHooks): Promise<AddressLookupTableAccount> {
  const slot = await connection.getSlot("finalized");
  const [create, table] = AddressLookupTableProgram.createLookupTable({ authority: payer, payer, recentSlot: Math.max(0, slot - 1) });
  const extensions = [];
  for (let start = 0; start < addresses.length; start += ADDRESSES_PER_EXTEND) {
    extensions.push(AddressLookupTableProgram.extendLookupTable({ payer, authority: payer, lookupTable: table, addresses: addresses.slice(start, start + ADDRESSES_PER_EXTEND) }));
  }
  const groups = [[create, extensions[0]], ...extensions.slice(1).map((instruction) => [instruction])];

  const latest = await connection.getLatestBlockhash("confirmed");
  const unsigned = groups.map((group) => new VersionedTransaction(new TransactionMessage({ payerKey: payer, recentBlockhash: latest.blockhash, instructions: group }).compileToV0Message()));
  hooks.onPrepared?.();
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
