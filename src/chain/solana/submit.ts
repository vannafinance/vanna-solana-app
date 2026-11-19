// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\tx.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\broadcast.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\confirmation.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\errors.ts

import { sha256 } from "@noble/hashes/sha256";
import { Buffer } from "buffer";

import { emitTxStatus, signSolana, signSolanaBatch, requireActiveRealWallet, WalletCancelledError } from "@/chain/sign";
import { VANNA_PROGRAM_ID } from "./config";
import { cosign, forkFeePayer, type FeePayer } from "./fee-payer";
import { decode58 } from "./pda";
import { base58 } from "./prices";
import { rpc } from "./rpc";

export const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";

/**
 * Heap frame requested for every transaction that calls the Vanna core. The core's allocator
 * grows upward and can use a frame up to 256 KiB (tx.ts:VANNA_HEAP_FRAME_BYTES).
 */
export const VANNA_HEAP_FRAME_BYTES = 256 * 1024; // 262,144 bytes

export type AccountMeta = {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
};

export type RawInstruction = {
  programId: string;
  keys: AccountMeta[];
  data: Uint8Array | Buffer;
};

export type CompiledInstruction = {
  programIdIndex: number;
  keyIndices: number[];
  data: Uint8Array;
};

export type AddressLookupTableAccount = {
  address: string;
  addresses: string[];
};

export type AddressTableLookup = {
  accountKey: string;
  writableIndexes: number[];
  readonlyIndexes: number[];
};

export type MessageHeader = {
  numRequiredSignatures: number;
  numReadonlySignedAccounts: number;
  numReadonlyUnsignedAccounts: number;
};

export type MessageV0 = {
  header: MessageHeader;
  staticAccountKeys: string[];
  recentBlockhash: string;
  compiledInstructions: CompiledInstruction[];
  addressTableLookups: AddressTableLookup[];
};

export type MessageLegacy = {
  header: MessageHeader;
  accountKeys: string[];
  recentBlockhash: string;
  compiledInstructions: CompiledInstruction[];
};

export type SendOptions = {
  label?: string;
  computeUnits?: number;
  lookupTableAddresses?: string[];
  payer?: string;
  skipPreflight?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
  /**
   * Only lookup tables a wallet can resolve: tables that exist on real mainnet with the same addresses at the same indexes as
   * the fork's copy (walletSafeLookupTables), and never the fork-only table. A transaction that does not fit then fails with
   * WalletTxTooLargeError before anything is signed, so the caller can try a smaller route.
   */
  walletSafe?: boolean;
  onStatus?: (status: "simulating" | "signing" | "sending" | "confirming") => void;
  /** Aborted while the wallet has not answered: nothing is sent (WalletCancelledError). */
  cancel?: AbortSignal;
};

// ---------------------------------------------------------------------------------------------
// Compact-u16 / Varint Encoders
// ---------------------------------------------------------------------------------------------

export function encodeCompactU16(val: number): Uint8Array {
  const bytes: number[] = [];
  let rem = val;
  while (rem >= 0x80) {
    bytes.push((rem & 0x7f) | 0x80);
    rem >>= 7;
  }
  bytes.push(rem & 0x7f);
  return new Uint8Array(bytes);
}

export function decodeCompactU16(bytes: Uint8Array, offset: number): [number, number] {
  let val = 0;
  let shift = 0;
  let bytesRead = 0;
  while (true) {
    const b = bytes[offset + bytesRead++];
    val |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return [val, bytesRead];
}

// ---------------------------------------------------------------------------------------------
// ComputeBudget Program Instruction Builders
// ---------------------------------------------------------------------------------------------

/**
 * SetComputeUnitLimit instruction: discriminator u8 = 2, units u32 LE (5 bytes total).
 * Ported from apps/solana/lib/solana/tx.ts:ComputeBudgetProgram.setComputeUnitLimit
 */
export function setComputeUnitLimitIx(units: number): RawInstruction {
  const data = Buffer.alloc(5);
  data.writeUInt8(2, 0);
  data.writeUInt32LE(units, 1);
  return {
    programId: COMPUTE_BUDGET_PROGRAM_ID,
    keys: [],
    data,
  };
}

/**
 * RequestHeapFrame instruction: discriminator u8 = 1, bytes u32 LE (5 bytes total).
 * Ported from apps/solana/lib/solana/tx.ts:ComputeBudgetProgram.requestHeapFrame
 */
export function requestHeapFrameIx(bytes: number = VANNA_HEAP_FRAME_BYTES): RawInstruction {
  const data = Buffer.alloc(5);
  data.writeUInt8(1, 0);
  data.writeUInt32LE(bytes, 1);
  return {
    programId: COMPUTE_BUDGET_PROGRAM_ID,
    keys: [],
    data,
  };
}

/**
 * Prepends ComputeBudget instructions matching apps/solana/lib/solana/tx.ts:withComputeBudget.
 */
export function withComputeBudget(instructions: RawInstruction[], units?: number): RawInstruction[] {
  const budget: RawInstruction[] = [];
  if (units) {
    budget.push(setComputeUnitLimitIx(units));
  }
  if (instructions.some((ix) => ix.programId === VANNA_PROGRAM_ID)) {
    budget.push(requestHeapFrameIx(VANNA_HEAP_FRAME_BYTES));
  }
  return [...budget, ...instructions];
}

// ---------------------------------------------------------------------------------------------
// Address Lookup Table Account Fetching
// ---------------------------------------------------------------------------------------------

/**
 * Fetches and parses Address Lookup Table accounts from the fork RPC.
 * Accounts have a 56-byte header followed by packed 32-byte pubkeys.
 */
export async function fetchLookupTables(addresses: string[]): Promise<AddressLookupTableAccount[]> {
  if (!addresses.length) return [];
  const res = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [
    addresses,
    { encoding: "base64" },
  ]);
  const out: AddressLookupTableAccount[] = [];
  addresses.forEach((addr, i) => {
    const acc = res.value[i];
    if (!acc) return;
    const buf = Buffer.from(acc.data[0], "base64");
    if (buf.length < 56) return;
    const rawKeys = buf.subarray(56);
    const count = Math.floor(rawKeys.length / 32);
    const keys: string[] = [];
    for (let k = 0; k < count; k++) {
      keys.push(base58(rawKeys.subarray(k * 32, (k + 1) * 32)));
    }
    out.push({ address: addr, addresses: keys });
  });
  return out;
}

const STALE_PRONE_DEX_PROGRAMS = new Set([
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", // Raydium CLMM
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo", // Meteora DLMM
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // Orca Whirlpool
]);
const TOKEN_PROGRAMS = new Set(["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"]);

/**
 * Ported from apps/solana/lib/solana/fork-heal.ts:healStaleDexPools. The fork clones a DEX pool once and freezes it,
 * while Jupiter builds against live mainnet. Re-cloning the pools, their token vaults and the route's lookup tables
 * brings them back in line. Returns how many accounts were reset, so a genuinely different failure is not retried.
 */
async function healStaleDexPools(ixs: RawInstruction[], tableAddresses: string[]): Promise<number> {
  try {
    const keys = [...new Set(ixs.flatMap((ix) => ix.keys.map((k) => k.pubkey)))];
    const infos: ({ owner: string; data: [string, string] } | null)[] = [];
    for (let i = 0; i < keys.length; i += 100) {
      // Only bytes 32..64 are needed: some accounts in these transactions are very large.
      const res = await rpc<{ value: ({ owner: string; data: [string, string] } | null)[] }>("getMultipleAccounts", [
        keys.slice(i, i + 100),
        { encoding: "base64", dataSlice: { offset: 32, length: 32 } },
      ]);
      infos.push(...res.value);
    }
    const dexOwned = new Set(keys.filter((_, i) => infos[i] && STALE_PRONE_DEX_PROGRAMS.has(infos[i]!.owner)));
    if (dexOwned.size === 0) return 0;
    const poolVaults = keys.filter((_, i) => {
      const info = infos[i];
      if (!info || !TOKEN_PROGRAMS.has(info.owner)) return false;
      const authority = Buffer.from(info.data[0], "base64");
      return authority.length === 32 && dexOwned.has(base58(authority));
    });
    const stale = [...new Set([...dexOwned, ...poolVaults, ...tableAddresses])];
    const resets = await Promise.all(stale.map((address) => rpc("surfnet_resetAccount", [address]).then(() => true, () => false)));
    return resets.filter(Boolean).length;
  } catch {
    return 0;
  }
}

export const MAX_TX_BYTES = 1232;
const LOOKUP_TABLE_PROGRAM = "AddressLookupTab1e1111111111111111111111111";

/**
 * Wire size of these instructions as ONE v0 transaction without any lookup table (compute budget added as sendSolanaInstructions
 * does, the wallet paying the fee). Callers use it to split work into transactions that need no fork lookup table: wallets resolve
 * lookup tables on real mainnet, where the fork's table does not exist. Phantom then accepts the approval but never returns the
 * signature (seen 2026-11-17), and Solflare refuses it.
 */
export function txSizeWithoutLookupTable(instructions: RawInstruction[], payer: string, computeUnits?: number, lookupTables: AddressLookupTableAccount[] = []): number {
  const compiled = compileV0Message(payer, withDurableNonce(withComputeBudget(instructions, computeUnits), payer, forkNonceAddress(payer)), "11111111111111111111111111111111", lookupTables);
  const sigs = Array.from({ length: compiled.message.header.numRequiredSignatures }, () => new Uint8Array(64));
  return serializeTransaction(compiled.serialized, sigs).length;
}

/** Thrown before signing when a walletSafe transaction does not fit in one transaction with wallet-resolvable tables only. */
export class WalletTxTooLargeError extends Error {
  readonly bytes: number;
  constructor(bytes: number, label = "Transaction") {
    super(`${label} is too large for the wallet (${bytes} bytes, max ${MAX_TX_BYTES})`);
    this.name = "WalletTxTooLargeError";
    this.bytes = bytes;
  }
}

// The address a wallet's own fork-only lookup table is written to (writeForkLookupTable).
function forkLookupTableAddress(payer: string): string {
  return base58(sha256(Buffer.concat([Buffer.from(decode58(payer)), Buffer.from("vanna-tx-lookup"), Buffer.from(decode58(LOOKUP_TABLE_PROGRAM))])));
}

const MAINNET_RPC = "https://api.mainnet-beta.solana.com";
const mainnetChecked = new Map<string, string>(); // table -> fork copy (base64) that matched mainnet

/**
 * The lookup tables (fork copies) that a wallet resolves to the same addresses. Wallets read tables from REAL mainnet, so a
 * table that is missing there, or whose fork copy differs from mainnet at any index, makes the wallet sign something else or
 * not finish (Phantom took the approval and never answered, 2026-11-17, with the fork-only table HdoyXn... in a margin swap).
 * Mainnet tables only grow, so the fork copy must be a prefix of the mainnet table. If mainnet cannot be reached, the route's
 * own tables are kept (Jupiter and Titan build them from mainnet) and only the app's fork-only table is dropped.
 */
// Wallet-safe tables already checked in the last minute (public mainnet tables only grow; one action checks the same tables
// for every part and every size attempt). Never holds the wallet's own fork-only table.
const safeTableCache = new Map<string, { at: number; table: AddressLookupTableAccount | null }>();
export async function walletSafeLookupTables(addresses: string[], wallet?: string): Promise<AddressLookupTableAccount[]> {
  const own = wallet ? forkLookupTableAddress(wallet) : null;
  const all = [...new Set(addresses)].filter((a) => a !== own);
  const cached = (a: string) => { const c = safeTableCache.get(a); return c && Date.now() - c.at < 60_000 ? c : null; };
  const wanted = all.filter((a) => !cached(a));
  if (wanted.length) {
    const found = await walletSafeLookupTablesNow(wanted);
    for (const a of wanted) safeTableCache.set(a, { at: Date.now(), table: found.find((t) => t.address === a) ?? null });
  }
  return all.map((a) => cached(a)?.table ?? null).filter((t): t is AddressLookupTableAccount => t !== null);
}
async function walletSafeLookupTablesNow(wanted: string[]): Promise<AddressLookupTableAccount[]> {
  if (!wanted.length) return [];
  const fork = await rpc<{ value: ({ owner: string; data: [string, string] } | null)[] }>("getMultipleAccounts", [wanted, { encoding: "base64" }]);
  const forkData = new Map<string, string>();
  wanted.forEach((a, i) => {
    const acc = fork.value[i];
    if (acc && acc.owner === LOOKUP_TABLE_PROGRAM) forkData.set(a, acc.data[0]);
  });
  const toCheck = [...forkData.keys()].filter((a) => mainnetChecked.get(a) !== forkData.get(a));
  const safe = new Set([...forkData.keys()].filter((a) => !toCheck.includes(a)));
  if (toCheck.length) {
    try {
      const res = await fetch(MAINNET_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [toCheck, { encoding: "base64" }] }),
      });
      const body = (await res.json()) as { result?: { value: ({ owner: string; data: [string, string] } | null)[] } };
      if (!body.result) throw new Error("mainnet RPC did not answer");
      toCheck.forEach((a, i) => {
        const main = body.result!.value[i];
        if (!main || main.owner !== LOOKUP_TABLE_PROGRAM) return;
        const f = Buffer.from(forkData.get(a)!, "base64").subarray(56);
        const m = Buffer.from(main.data[0], "base64").subarray(56);
        if (f.length <= m.length && f.equals(m.subarray(0, f.length))) {
          safe.add(a);
          mainnetChecked.set(a, forkData.get(a)!);
        }
      });
    } catch {
      toCheck.forEach((a) => safe.add(a));
    }
  }
  return (await fetchLookupTables(wanted.filter((a) => safe.has(a))));
}

/** A simulation that failed because a lookup table the transaction names could not be loaded on the fork. */
const LOOKUP_TABLE_ERROR = /AddressLookupTable/;
const lookupTableError = (err: unknown) => !!err && LOOKUP_TABLE_ERROR.test(JSON.stringify(err));

/**
 * FORK: a simulation failed with AddressLookupTableNotFound (seen 2026-11-19 12:46 on the withdraw right after Close all, with
 * tables that exist on both the fork and mainnet minutes later). Forgets the wallet-safe check of these tables, reads them on the
 * fork again (the fork loads an account it does not hold yet from mainnet on a read) and re-clones any that is still missing.
 * The wallet's own fork-only table is never re-cloned (it does not exist on mainnet). Returns the tables still missing.
 */
async function healLookupTables(addresses: string[], wallet?: string): Promise<string[]> {
  const own = wallet ? forkLookupTableAddress(wallet) : null;
  const tables = [...new Set(addresses)];
  if (!tables.length) return [];
  for (const a of tables) {
    safeTableCache.delete(a);
    mainnetChecked.delete(a);
  }
  const missingNow = async () => {
    const res = await rpc<{ value: ({ owner: string } | null)[] }>("getMultipleAccounts", [tables, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]).catch(() => null);
    return tables.filter((_, i) => !res || res.value[i]?.owner !== LOOKUP_TABLE_PROGRAM);
  };
  const before = await missingNow();
  const clonable = before.filter((a) => a !== own);
  if (clonable.length) await Promise.all(clonable.map((a) => rpc("surfnet_resetAccount", [a]).catch(() => undefined)));
  const after = clonable.length ? await missingNow() : before;
  if (__DEV__) console.log(`[tx-time] lookup tables re-read after AddressLookupTableNotFound: ${tables.join(", ")}; missing on the fork: ${before.join(", ") || "none"}; still missing: ${after.join(", ") || "none"}`);
  return after;
}

// ---------------------------------------------------------------------------------------------
// Durable nonce (fork only)
// ---------------------------------------------------------------------------------------------
//
// Fork slots are ~0.22 s, so a blockhash lives only ~150 slots = ~35 s there, while a wallet that warns about the fork (Phantom:
// "Request blocked", "Failed to simulate", "Are you sure?") takes longer than that to approve. On 2026-11-17 Phantom returned a
// correctly signed deposit + borrow after 115 s and the fork dropped it with BlockhashNotFound. A durable nonce has no expiry: the
// transaction starts with AdvanceNonceAccount and carries the nonce value in place of the blockhash (checked on the fork: a nonce
// transaction built 45 s earlier confirmed). The nonce account is written straight onto the fork, like the lookup table below.

const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const RECENT_BLOCKHASHES_SYSVAR = "SysvarRecentB1ockHashes11111111111111111111";
const NONCE_ACCOUNT_BYTES = 80;
const NONCE_RENT_LAMPORTS = 1_447_680; // rent-exempt minimum for 80 bytes

/**
 * This wallet's fork nonce account (a fixed address derived from the wallet; it never exists on a real cluster). `slot` > 0 gives
 * the extra nonce accounts of a batch: each transaction signed in the same approval needs its own nonce, because the first one
 * advances (changes) its nonce when it lands.
 */
export function forkNonceAddress(authority: string, slot = 0): string {
  const seed = slot ? `vanna-tx-nonce-${slot}` : "vanna-tx-nonce";
  return base58(sha256(Buffer.concat([Buffer.from(decode58(authority)), Buffer.from(seed), Buffer.from(decode58(SYSTEM_PROGRAM))])));
}

/**
 * AdvanceNonceAccount first, and a priority fee of 1 micro-lamport per unit when none is set: Phantom otherwise inserts its own
 * SetComputeUnitPrice instruction at the very start (it did on the deposit of 2026-11-17), which would push AdvanceNonceAccount
 * out of first place and invalidate the nonce.
 */
function withDurableNonce(ixs: RawInstruction[], authority: string, nonceAccount: string): RawInstruction[] {
  const advance: RawInstruction = {
    programId: SYSTEM_PROGRAM,
    keys: [
      { pubkey: nonceAccount, isSigner: false, isWritable: true },
      { pubkey: RECENT_BLOCKHASHES_SYSVAR, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data: Uint8Array.of(4, 0, 0, 0),
  };
  const hasPrice = ixs.some((ix) => ix.programId === COMPUTE_BUDGET_PROGRAM_ID && ix.data[0] === 3);
  if (hasPrice) return [advance, ...ixs];
  const price = Buffer.alloc(9);
  price.writeUInt8(3, 0);
  price.writeBigUInt64LE(1n, 1);
  const priceIx: RawInstruction = { programId: COMPUTE_BUDGET_PROGRAM_ID, keys: [], data: price };
  const lastBudget = ixs.reduce((at, ix, i) => (ix.programId === COMPUTE_BUDGET_PROGRAM_ID ? i : at), -1);
  return [advance, ...ixs.slice(0, lastBudget + 1), priceIx, ...ixs.slice(lastBudget + 1)];
}

/** Writes a fresh nonce (authority = the wallet) onto the fork and returns its value, or null when the fork refuses. */
async function writeForkNonce(authority: string, nonceAccount: string): Promise<string | null> {
  try {
    const value = sha256(Buffer.concat([Buffer.from(decode58(nonceAccount)), Buffer.from(`${Date.now()}:${Math.random()}`)]));
    const data = Buffer.alloc(NONCE_ACCOUNT_BYTES);
    data.writeUInt32LE(1, 0); // version: current
    data.writeUInt32LE(1, 4); // state: initialized
    Buffer.from(decode58(authority)).copy(data, 8);
    Buffer.from(value).copy(data, 40);
    data.writeBigUInt64LE(5000n, 72); // lamports per signature
    await rpc("surfnet_setAccount", [
      nonceAccount,
      { lamports: NONCE_RENT_LAMPORTS, data: data.toString("hex"), owner: SYSTEM_PROGRAM, executable: false, rentEpoch: 0 },
    ]);
    return base58(value);
  } catch {
    return null;
  }
}

/**
 * Writes this wallet's lookup table straight onto the fork (as the perps flow does), so no extra wallet approvals are
 * needed. The website reaches the same result with a temporary on-chain table (tx.ts:createPersonalLookupTable).
 */
async function writeForkLookupTable(payer: string, ixs: RawInstruction[], existing: AddressLookupTableAccount[]): Promise<string> {
  // The durable-nonce accounts stay static keys.
  const seen = new Set([...existing.flatMap((t) => t.addresses), forkNonceAddress(payer), RECENT_BLOCKHASHES_SYSVAR]);
  const programs = new Set(ixs.map((ix) => ix.programId));
  const keys: string[] = [];
  for (const ix of ixs) {
    for (const k of ix.keys) {
      if (k.isSigner || k.pubkey === payer || programs.has(k.pubkey) || seen.has(k.pubkey)) continue;
      seen.add(k.pubkey);
      keys.push(k.pubkey);
    }
  }
  if (keys.length > 256) throw new Error("Transaction needs too many accounts");
  const address = forkLookupTableAddress(payer);
  const data = Buffer.alloc(56 + 32 * keys.length);
  data.writeUInt32LE(1, 0); // state: table
  data.fill(0xff, 4, 12); // never deactivated
  keys.forEach((key, i) => Buffer.from(decode58(key)).copy(data, 56 + 32 * i));
  await rpc("surfnet_setAccount", [
    address,
    { lamports: 10_000_000, data: data.toString("hex"), owner: LOOKUP_TABLE_PROGRAM, executable: false, rentEpoch: 0 },
  ]);
  return address;
}

// ---------------------------------------------------------------------------------------------
// V0 Message Compiler & Serializer
// ---------------------------------------------------------------------------------------------

/**
 * Compiles instructions into a Solana Versioned V0 Message (TransactionMessage.compileToV0Message).
 * Correctly resolves accounts against Address Lookup Tables:
 * 1. Signers (including payer) are strictly static.
 * 2. Static accounts partitioned: writable signers, readonly signers, writable non-signers, readonly non-signers.
 * 3. Table accounts loaded: writable from each table in order, then readonly from each table in order.
 */
export function compileV0Message(
  payer: string,
  instructions: RawInstruction[],
  recentBlockhash: string,
  lookupTables: AddressLookupTableAccount[] = []
): { message: MessageV0; serialized: Uint8Array } {
  // Aggregate account roles
  const isSignerMap = new Map<string, boolean>();
  const isWritableMap = new Map<string, boolean>();
  const programIds = new Set<string>();

  // Payer is always writable signer
  isSignerMap.set(payer, true);
  isWritableMap.set(payer, true);

  for (const ix of instructions) {
    programIds.add(ix.programId);
    if (!isSignerMap.has(ix.programId)) {
      isSignerMap.set(ix.programId, false);
      isWritableMap.set(ix.programId, false);
    }
    for (const key of ix.keys) {
      if (key.isSigner) isSignerMap.set(key.pubkey, true);
      else if (!isSignerMap.has(key.pubkey)) isSignerMap.set(key.pubkey, false);

      if (key.isWritable) isWritableMap.set(key.pubkey, true);
      else if (!isWritableMap.has(key.pubkey)) isWritableMap.set(key.pubkey, false);
    }
  }

  // Map each address in lookup tables
  type TableEntry = { tableIndex: number; keyIndex: number };
  const tableLookupMap = new Map<string, TableEntry>();
  lookupTables.forEach((table, tIdx) => {
    table.addresses.forEach((addr, kIdx) => {
      if (!tableLookupMap.has(addr)) {
        tableLookupMap.set(addr, { tableIndex: tIdx, keyIndex: kIdx });
      }
    });
  });

  const tableLookups: { accountKey: string; writableIndexes: number[]; readonlyIndexes: number[] }[] = lookupTables.map((t) => ({
    accountKey: t.address,
    writableIndexes: [],
    readonlyIndexes: [],
  }));

  const staticWritableSigners: string[] = [payer];
  const staticReadonlySigners: string[] = [];
  const staticWritableNonSigners: string[] = [];
  const staticReadonlyNonSigners: string[] = [];

  const allPubkeys = [...isSignerMap.keys()];
  for (const pk of allPubkeys) {
    if (pk === payer) continue;
    const isSigner = isSignerMap.get(pk)!;
    const isWritable = isWritableMap.get(pk)!;

    if (isSigner) {
      if (isWritable) staticWritableSigners.push(pk);
      else staticReadonlySigners.push(pk);
      continue;
    }

    // Program IDs MUST be static accounts in Solana Versioned V0 messages
    if (programIds.has(pk)) {
      if (isWritable) staticWritableNonSigners.push(pk);
      else staticReadonlyNonSigners.push(pk);
      continue;
    }

    // Non-signer: check if it can be resolved from a lookup table
    const match = tableLookupMap.get(pk);
    if (match !== undefined) {
      const entry = tableLookups[match.tableIndex];
      if (isWritable) {
        if (!entry.writableIndexes.includes(match.keyIndex)) {
          entry.writableIndexes.push(match.keyIndex);
        }
      } else {
        if (!entry.readonlyIndexes.includes(match.keyIndex)) {
          entry.readonlyIndexes.push(match.keyIndex);
        }
      }
    } else {
      // Static non-signer
      if (isWritable) staticWritableNonSigners.push(pk);
      else staticReadonlyNonSigners.push(pk);
    }
  }

  const staticAccountKeys = [
    ...staticWritableSigners,
    ...staticReadonlySigners,
    ...staticWritableNonSigners,
    ...staticReadonlyNonSigners,
  ];

  const header: MessageHeader = {
    numRequiredSignatures: staticWritableSigners.length + staticReadonlySigners.length,
    numReadonlySignedAccounts: staticReadonlySigners.length,
    numReadonlyUnsignedAccounts: staticReadonlyNonSigners.length,
  };

  // Only keep tables with at least one resolved address
  const activeLookups = tableLookups.filter((l) => l.writableIndexes.length > 0 || l.readonlyIndexes.length > 0);

  // Build global address index map:
  // 1. Static keys
  // 2. Writable table accounts in table order
  // 3. Readonly table accounts in table order
  const addressToIndex = new Map<string, number>();
  let nextIdx = 0;
  for (const pk of staticAccountKeys) {
    addressToIndex.set(pk, nextIdx++);
  }

  for (const lookup of activeLookups) {
    const table = lookupTables.find((t) => t.address === lookup.accountKey);
    if (!table) continue;
    for (const idx of lookup.writableIndexes) {
      const addr = table.addresses[idx];
      addressToIndex.set(addr, nextIdx++);
    }
  }

  for (const lookup of activeLookups) {
    const table = lookupTables.find((t) => t.address === lookup.accountKey);
    if (!table) continue;
    for (const idx of lookup.readonlyIndexes) {
      const addr = table.addresses[idx];
      addressToIndex.set(addr, nextIdx++);
    }
  }

  // Compile instructions
  const compiledInstructions: CompiledInstruction[] = instructions.map((ix) => {
    const pIdx = addressToIndex.get(ix.programId);
    if (pIdx === undefined) throw new Error(`Missing program index for ${ix.programId}`);
    const keyIndices = ix.keys.map((k) => {
      const idx = addressToIndex.get(k.pubkey);
      if (idx === undefined) throw new Error(`Missing account index for ${k.pubkey}`);
      return idx;
    });
    return {
      programIdIndex: pIdx,
      keyIndices,
      data: ix.data instanceof Uint8Array ? ix.data : new Uint8Array(ix.data),
    };
  });

  const message: MessageV0 = {
    header,
    staticAccountKeys,
    recentBlockhash,
    compiledInstructions,
    addressTableLookups: activeLookups,
  };

  const serialized = serializeV0Message(message);
  return { message, serialized };
}

/**
 * Serializes a Versioned V0 Message to wire bytes (0x80 prefix + header + static keys + blockhash + instructions + address lookups).
 */
export function serializeV0Message(msg: MessageV0): Uint8Array {
  const parts: Uint8Array[] = [];
  // Prefix byte: 0x80 (version 0)
  parts.push(Uint8Array.of(0x80));

  // Header: 3 bytes
  parts.push(
    Uint8Array.of(
      msg.header.numRequiredSignatures,
      msg.header.numReadonlySignedAccounts,
      msg.header.numReadonlyUnsignedAccounts
    )
  );

  // Static account keys
  parts.push(encodeCompactU16(msg.staticAccountKeys.length));
  for (const pk of msg.staticAccountKeys) {
    parts.push(decode58(pk));
  }

  // Recent blockhash: 32 bytes
  parts.push(decode58(msg.recentBlockhash));

  // Instructions
  parts.push(encodeCompactU16(msg.compiledInstructions.length));
  for (const ix of msg.compiledInstructions) {
    parts.push(Uint8Array.of(ix.programIdIndex));
    parts.push(encodeCompactU16(ix.keyIndices.length));
    parts.push(Uint8Array.from(ix.keyIndices));
    parts.push(encodeCompactU16(ix.data.length));
    parts.push(ix.data);
  }

  // Address Table Lookups
  parts.push(encodeCompactU16(msg.addressTableLookups.length));
  for (const lookup of msg.addressTableLookups) {
    parts.push(decode58(lookup.accountKey));
    parts.push(encodeCompactU16(lookup.writableIndexes.length));
    parts.push(Uint8Array.from(lookup.writableIndexes));
    parts.push(encodeCompactU16(lookup.readonlyIndexes.length));
    parts.push(Uint8Array.from(lookup.readonlyIndexes));
  }

  const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Legacy Message Compiler & Serializer
// ---------------------------------------------------------------------------------------------

/**
 * Compiles instructions into a Legacy Solana Message (no version prefix, no lookup tables).
 */
export function compileLegacyMessage(
  payer: string,
  instructions: RawInstruction[],
  recentBlockhash: string
): { message: MessageLegacy; serialized: Uint8Array } {
  const isSignerMap = new Map<string, boolean>();
  const isWritableMap = new Map<string, boolean>();

  isSignerMap.set(payer, true);
  isWritableMap.set(payer, true);

  for (const ix of instructions) {
    if (!isSignerMap.has(ix.programId)) {
      isSignerMap.set(ix.programId, false);
      isWritableMap.set(ix.programId, false);
    }
    for (const key of ix.keys) {
      if (key.isSigner) isSignerMap.set(key.pubkey, true);
      else if (!isSignerMap.has(key.pubkey)) isSignerMap.set(key.pubkey, false);

      if (key.isWritable) isWritableMap.set(key.pubkey, true);
      else if (!isWritableMap.has(key.pubkey)) isWritableMap.set(key.pubkey, false);
    }
  }

  const staticWritableSigners: string[] = [payer];
  const staticReadonlySigners: string[] = [];
  const staticWritableNonSigners: string[] = [];
  const staticReadonlyNonSigners: string[] = [];

  for (const [pk, isSigner] of isSignerMap.entries()) {
    if (pk === payer) continue;
    const isWritable = isWritableMap.get(pk)!;
    if (isSigner) {
      if (isWritable) staticWritableSigners.push(pk);
      else staticReadonlySigners.push(pk);
    } else {
      if (isWritable) staticWritableNonSigners.push(pk);
      else staticReadonlyNonSigners.push(pk);
    }
  }

  const accountKeys = [
    ...staticWritableSigners,
    ...staticReadonlySigners,
    ...staticWritableNonSigners,
    ...staticReadonlyNonSigners,
  ];

  const header: MessageHeader = {
    numRequiredSignatures: staticWritableSigners.length + staticReadonlySigners.length,
    numReadonlySignedAccounts: staticReadonlySigners.length,
    numReadonlyUnsignedAccounts: staticReadonlyNonSigners.length,
  };

  const addressToIndex = new Map<string, number>();
  accountKeys.forEach((pk, idx) => addressToIndex.set(pk, idx));

  const compiledInstructions: CompiledInstruction[] = instructions.map((ix) => ({
    programIdIndex: addressToIndex.get(ix.programId)!,
    keyIndices: ix.keys.map((k) => addressToIndex.get(k.pubkey)!),
    data: ix.data instanceof Uint8Array ? ix.data : new Uint8Array(ix.data),
  }));

  const message: MessageLegacy = {
    header,
    accountKeys,
    recentBlockhash,
    compiledInstructions,
  };

  const serialized = serializeLegacyMessage(message);
  return { message, serialized };
}

export function serializeLegacyMessage(msg: MessageLegacy): Uint8Array {
  const parts: Uint8Array[] = [];
  parts.push(
    Uint8Array.of(
      msg.header.numRequiredSignatures,
      msg.header.numReadonlySignedAccounts,
      msg.header.numReadonlyUnsignedAccounts
    )
  );

  parts.push(encodeCompactU16(msg.accountKeys.length));
  for (const pk of msg.accountKeys) {
    parts.push(decode58(pk));
  }

  parts.push(decode58(msg.recentBlockhash));

  parts.push(encodeCompactU16(msg.compiledInstructions.length));
  for (const ix of msg.compiledInstructions) {
    parts.push(Uint8Array.of(ix.programIdIndex));
    parts.push(encodeCompactU16(ix.keyIndices.length));
    parts.push(Uint8Array.from(ix.keyIndices));
    parts.push(encodeCompactU16(ix.data.length));
    parts.push(ix.data);
  }

  const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/**
 * Combines compact-u16 signature array with serialized message bytes to create a wire transaction.
 */
export function serializeTransaction(messageBytes: Uint8Array, signatures: Uint8Array[]): Uint8Array {
  const sigCountCompact = encodeCompactU16(signatures.length);
  const totalLen = sigCountCompact.length + signatures.length * 64 + messageBytes.length;
  const out = new Uint8Array(totalLen);
  let offset = 0;
  out.set(sigCountCompact, offset);
  offset += sigCountCompact.length;
  for (const sig of signatures) {
    out.set(sig, offset);
    offset += 64;
  }
  out.set(messageBytes, offset);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Error Decoding & Friendly Attribution
// ---------------------------------------------------------------------------------------------

const FRIENDLY_ERRORS: Record<string, string> = {
  HealthFactorTooLow: "This would push your health factor to or below 1.10. Reduce the amount.",
  // Vanna's validator (phoenix.rs) on an order for a new Phoenix market: seen on the fork with four markets open (2026-11-18).
  TooManyPositions: "You already have as many Perps markets open as a margin account can hold. Close one, or add to a market you already hold.",
  StalePrice: "Oracle price is stale. Prices were refreshed; please retry.",
  InsufficientLiquidity: "The pool does not have enough available liquidity for this amount.",
  InsufficientCollateral: "Your margin account does not hold that much of this asset.",
  IncompletePositionAccounts: "Position accounts were incomplete (the account changed). Please retry.",
  BelowMinimumInitialSupply: "The first supply to a pool must be at least 1,000 base units.",
  SlippageExceeded: "The result moved beyond your slippage bound. Please retry.",
  TooManyAssets: "Your margin account already holds the maximum number of assets.",
  BorrowCapExceeded: "This borrow exceeds the pool's borrow cap.",
  SupplyCapExceeded: "This supply exceeds the pool's supply cap.",
  ProtocolActionPaused: "This action is currently paused by the protocol.",
  OutstandingDebt: "This position still has outstanding debt.",
  ZeroAmount: "Amount must be greater than zero.",
  InsufficientFunds: "Insufficient token balance for this transfer.",
};

// Every error of the core program (IDL vanna_credit_layer.json, codes 6000-6060), with the IDL message as the fallback copy, as
// the website decodes them (apps/solana/lib/solana/errors.ts: FRIENDLY first, else the IDL msg).
const IDL_ERRORS: Record<number, [string, string]> = {
  6000: ["Unauthorized", "Signer is not authorized to perform this action"],
  6001: ["InvalidPendingAdmin", "Signer is not the pending admin"],
  6002: ["InvalidTreasury", "Treasury cannot be the zero address"],
  6003: ["InvalidOperatingMode", "Operating mode value is not a recognized mode"],
  6004: ["ProtocolActionPaused", "This action is paused by the current protocol operating mode"],
  6005: ["InvalidReserveStatus", "This action is not allowed by the current reserve status"],
  6006: ["InvalidPda", "Account did not derive from the expected PDA seeds"],
  6007: ["InvalidBump", "Account bump does not match the stored canonical bump"],
  6008: ["InvalidMint", "Mint does not match the expected asset mint"],
  6009: ["InvalidTokenProgram", "Token program must be classic SPL Token or Token-2022"],
  6010: ["InvalidVaultAuthority", "Token account authority does not match the expected PDA"],
  6011: ["InvalidShareMintAuthority", "Share mint authority does not match the expected Reserve PDA"],
  6012: ["UnsupportedTokenExtension", "Token-2022 mint extension is not supported in this release"],
  6013: ["AssetNotCollateralEnabled", "Asset is not on Vanna's allowed token list"],
  6014: ["AssetNotBorrowEnabled", "Asset is not enabled for borrowing"],
  6015: ["SupplyCapExceeded", "Reserve supply cap exceeded"],
  6016: ["BorrowCapExceeded", "Reserve borrow cap exceeded"],
  6017: ["InsufficientLiquidity", "Reserve does not have enough available liquidity"],
  6018: ["InsufficientCollateral", "Margin account does not have enough credited collateral"],
  6019: ["InsufficientShares", "Lender does not have enough shares"],
  6020: ["SlippageExceeded", "Actual result exceeded the caller's slippage bound"],
  6021: ["TooManyAssets", "Allowed tokens plus this margin's venues and debts would exceed the per-margin limit"],
  6022: ["DuplicateAssetIndex", "Asset index is already present in the canonical active list"],
  6023: ["IncompletePositionAccounts", "Remaining accounts did not include every allowed token, venue and debt position"],
  6024: ["StalePrice", "Oracle price update is older than the configured maximum age"],
  6025: ["ConfidenceTooWide", "Oracle price confidence interval is wider than the configured maximum"],
  6026: ["HealthFactorTooLow", "Projected borrow health factor would fall below the required minimum"],
  6027: ["PositionHealthy", "Margin account is healthy and is not eligible for liquidation"],
  6028: ["CloseFactorExceeded", "Liquidation repay amount exceeds the configured close factor"],
  6029: ["OutstandingDebt", "Margin account still has outstanding debt"],
  6030: ["NonEmptyMargin", "Margin account still has open venue or debt positions"],
  6031: ["MathOverflow", "Arithmetic overflow"],
  6032: ["MathUnderflow", "Arithmetic underflow"],
  6033: ["DivisionByZero", "Division by zero"],
  6034: ["TimestampRegression", "Clock timestamp moved backwards relative to stored state"],
  6035: ["VaultAccountingInvariantFailed", "Reserve vault/share-mint accounting invariant failed"],
  6036: ["ZeroAmount", "Amount must be greater than zero"],
  6037: ["DuplicateAccount", "Duplicate account passed where distinct roles are required"],
  6038: ["ReserveAlreadyExists", "Reserve is already registered for this asset"],
  6039: ["InvalidRiskParameters", "Risk parameter configuration is invalid"],
  6040: ["InvalidRateModel", "Interest-rate model configuration is invalid"],
  6041: ["BelowMinimumInitialSupply", "Requested amount is below the required initial supply floor"],
  6042: ["NonEmptyDebtPosition", "Debt position is not empty"],
  6043: ["NonEmptyVault", "Collateral vault still holds a raw token balance"],
  6044: ["IntegrationDisabled", "External program integration is disabled"],
  6045: ["CallNotAllowed", "This external call is not allowed"],
  6046: ["InvalidCallAccounts", "External call accounts do not match the roles the validator's permit requires"],
  6047: ["InvalidCallResult", "External call left a margin vault in an invalid state"],
  6048: ["PriceTooDivergentFromTwap", "Oracle price is too far from its TWAP"],
  6049: ["InvalidAgentAccounts", "Agent accounts are missing, out of place or not the registered agent"],
  6050: ["InvalidAgentAnswer", "Agent answer is inconsistent with the call it was asked about"],
  6051: ["VenueAssetNotTransferable", "A venue position cannot be deposited or withdrawn as a token"],
  6052: ["NotAVenue", "Asset is not a venue"],
  6053: ["NotAToken", "Asset is not a token"],
  6054: ["VenuePositionsOpen", "The margin still holds an open position or collateral at the venue"],
  6055: ["NotProtocolConfig", "Account is not Vanna's protocol config"],
  6056: ["NothingToReclaim", "Pass the empty vault or debt position to close"],
  6057: ["SpendLimitExceeded", "External call spent more from a margin vault than its permit allows"],
  6058: ["IssuerControlsNotAccepted", "The mint's issuer can freeze, seize, pause, close or reprice it; register it with accept_issuer_controls"],
  6059: ["LiquidationCreatesBadDebt", "These venue calls would leave a solvent margin unable to repay its debt"],
  6060: ["DelistedCollateralHeld", "The margin still holds a token that was taken off the allow-list; relist it so it can be seized first"],
};
const CODE_TO_NAME: Record<number, string> = Object.fromEntries(Object.entries(IDL_ERRORS).map(([c, [n]]) => [c, n]));
const IDL_MESSAGE: Record<string, string> = Object.fromEntries(Object.values(IDL_ERRORS));

/**
 * Ported from apps/solana/lib/solana/errors.ts:decodeProgramError
 */
export function decodeProgramError(text: string): { name: string; message: string } | null {
  // A Phoenix market order with a minimum fill (perps opens ask for at least one lot) that would not fill reverts the whole transaction.
  if (/IOC order does not meet minimum requirements/.test(text)) {
    return { name: "NoFill", message: "No fill at your price limit (the price moved past it). Nothing was traded" };
  }
  // Phoenix's copied mark price aged past its window on the fork. Soft-stale: Phoenix penalises the PnL and, for some positions
  // (BTC-PERP long, 2026-11-18), then panics in its quantity math ("ORACLE STALENESS ... ** PANICKED **" -> ProgramFailedToComplete).
  // Hard-stale: "Cannot get mark price, staleness or validity check failed" -> InvalidAccountData.
  if (/ORACLE STALENESS|Cannot get mark price, staleness/.test(text)) {
    return { name: "StaleMarkPrice", message: "Phoenix's market price was out of date and the refresh did not land in time. Nothing was sent. Please retry." };
  }
  // FORK: Phoenix could not find the maker of a resting order (the re-cloned orderbook and the fork's trader list are out of step,
  // see BOOK_DESYNC_LOGS). Not a price or health problem, and nothing the person can fix by changing the order.
  if (/Failed to lookup trader at index|Traders view error: Position not found/.test(text)) {
    return {
      name: "PhoenixBookOutOfSync",
      message: "This network's copy of the market's order book lists makers its copy of Phoenix's trader list does not have, so the order cannot fill here right now. Nothing was signed or sent. Try again in a minute, or trade another market.",
    };
  }
  if (/exceeded CUs meter|Computational budget exceeded/i.test(text)) {
    return { name: "ComputeExhausted", message: "The transaction ran out of compute. Nothing was sent. Please retry." };
  }
  // Any other program panic: name the program's source file from the log line before "** PANICKED **".
  const panic = /Program log: ([^\n]+)\nProgram log: \*\* PANICKED \*\*/.exec(text);
  if (panic) {
    return { name: "ProgramPanicked", message: `A program stopped with an internal error (${panic[1].trim()}). Nothing was sent.` };
  }
  const anchor = /Error Code: (\w+)\. Error Number: (\d+)\. Error Message: ([^\n]+?)\.?(?:\n|$)/.exec(text);
  if (anchor) {
    const name = anchor[1];
    return { name, message: FRIENDLY_ERRORS[name] ?? anchor[3] };
  }
  const custom = /custom program error: (0x[0-9a-f]+)/i.exec(text) ?? /"Custom":(\d+)/.exec(text);
  if (custom) {
    const code = custom[1].startsWith("0x") ? parseInt(custom[1], 16) : Number(custom[1]);
    const name = CODE_TO_NAME[code];
    if (name) return { name, message: FRIENDLY_ERRORS[name] ?? IDL_MESSAGE[name] ?? name };
    if (code === 1) return { name: "InsufficientFunds", message: "Insufficient token balance for this transfer." };
  }
  for (const [name, msg] of Object.entries(FRIENDLY_ERRORS)) {
    if (text.includes(name)) return { name, message: msg };
  }
  for (const [name, msg] of Object.entries(IDL_MESSAGE)) {
    if (text.includes(name)) return { name, message: msg };
  }
  if (/insufficient lamports|insufficient funds for fee/i.test(text)) {
    return { name: "InsufficientLamports", message: "Not enough SOL to pay for this transaction. Use the faucet to top up." };
  }
  if (/Blockhash ?not ?found|block height exceeded/i.test(text)) {
    return { name: "ExpiredBlockhash", message: "Transaction expired before it landed. Please retry." };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Confirmation Polling
// ---------------------------------------------------------------------------------------------

/**
 * Ported from apps/solana/lib/solana/confirmation.ts:confirmSignatureHttp
 */
export async function pollSignatureStatus(signature: string, timeoutMs = 60_000): Promise<string> {
  const start = Date.now();
  const deadline = start + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await rpc<{ value: ({ err: unknown; confirmationStatus?: string } | null)[] }>(
        "getSignatureStatuses",
        [[signature], { searchTransactionHistory: Date.now() - start >= 10_000 }]
      );
      const status = res.value[0];
      if (status?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
        return signature;
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Transaction failed:")) throw e;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  // The clock may have run on while the app was frozen (the phone was busy, or another app took over): the transaction can have
  // landed meanwhile, so look once more before giving up.
  try {
    const last = await rpc<{ value: ({ err: unknown; confirmationStatus?: string } | null)[] }>("getSignatureStatuses", [[signature], { searchTransactionHistory: true }]);
    const status = last.value[0];
    if (status?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return signature;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Transaction failed:")) throw e;
  }
  throw new Error(`Confirmation timed out for ${signature}. Check transaction status before retrying.`);
}

// ---------------------------------------------------------------------------------------------
// The Unified Send Pipeline
// ---------------------------------------------------------------------------------------------

// `tables`: the lookup tables the message names (for the error message and the fork repair when one cannot be loaded).
type PreparedTx = { unsignedBase64: string; sponsor: FeePayer | null; label?: string; opts: SendOptions; tables: string[] };

/**
 * Builds one transaction ready for the wallet: compute budget, the durable nonce of `slot` (each transaction of a batch has its
 * own), lookup tables, size check, simulation (only when `simulate`: a later part of a batch depends on the earlier ones landing,
 * so it cannot be simulated before they have).
 */
// `refresh` (the batch part's `before`): when the simulation fails on a stale price, it is run forced and the simulation repeated
// once, so a market copy that aged while the transaction was built does not fail the check before the wallet is even asked.
async function prepareTransaction(
  instructions: RawInstruction[],
  opts: SendOptions,
  slot: number,
  simulate: boolean,
  refresh?: (retry: boolean) => Promise<void>,
): Promise<PreparedTx> {
  const wallet = opts.payer ?? requireActiveRealWallet("solana").full;
  const budgeted = withComputeBudget(instructions, opts.computeUnits);
  // On the fork the app pays the network fee (see fee-payer.ts), so wallets that check fees against real mainnet, where the
  // person has no SOL, have nothing to refuse. Only when the wallet still signs the transaction for its own account.
  const walletSigns = budgeted.some((ix) => ix.keys.some((k) => k.isSigner && k.pubkey === wallet));
  const sponsor = walletSigns ? await forkFeePayer() : null;
  const payer = sponsor?.address ?? wallet;
  // A durable nonce instead of a blockhash, so a slow wallet approval cannot expire the transaction (see withDurableNonce).
  const nonceAccount = walletSigns ? forkNonceAddress(wallet, slot) : null;
  const nonceValue = nonceAccount ? await writeForkNonce(wallet, nonceAccount) : null;
  const ixs = nonceAccount && nonceValue ? withDurableNonce(budgeted, wallet, nonceAccount) : budgeted;

  const loadTables = (addresses: string[]) => (opts.walletSafe ? walletSafeLookupTables(addresses, wallet) : fetchLookupTables(addresses));
  let lookupTables: AddressLookupTableAccount[] = await loadTables(opts.lookupTableAddresses ?? []);

  // A margin call lists the account pair of every protocol token, which can overflow one transaction.
  const size = () => {
    const compiled = compileV0Message(payer, ixs, "11111111111111111111111111111111", lookupTables);
    const sigs = Array.from({ length: compiled.message.header.numRequiredSignatures }, () => new Uint8Array(64));
    return serializeTransaction(compiled.serialized, sigs).length;
  };
  if (opts.walletSafe && size() > MAX_TX_BYTES) throw new WalletTxTooLargeError(size(), opts.label);
  if (size() > MAX_TX_BYTES) {
    lookupTables = [...lookupTables, ...(await fetchLookupTables([await writeForkLookupTable(wallet, ixs, lookupTables)]))];
    if (size() > MAX_TX_BYTES) throw new Error(`${opts.label ?? "Transaction"} is too large to send`);
  }

  if (simulate) {
    // Simulation (placeholder blockhash)
    const placeholderHash = "11111111111111111111111111111111";
    const run = () => {
      const { serialized: simMsgBytes, message: simMsg } = compileV0Message(payer, ixs, placeholderHash, lookupTables);
      const blank = Array.from({ length: simMsg.header.numRequiredSignatures }, () => new Uint8Array(64));
      const simBase64 = Buffer.from(serializeTransaction(simMsgBytes, blank)).toString("base64");
      return rpc<{ value: { err: unknown; logs: string[] | null } }>("simulateTransaction", [
        simBase64,
        { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" },
      ]);
    };
    opts.onStatus?.("simulating");
    let simRes = await run();
    if (simRes.value.err) {
      const routeTables = opts.lookupTableAddresses ?? [];
      if ((await healStaleDexPools(ixs, routeTables)) > 0) {
        lookupTables = [...(await loadTables(routeTables)), ...lookupTables.filter((t) => !routeTables.includes(t.address))];
        simRes = await run();
      }
    }
    // A lookup table the fork could not load: read / re-clone the tables, take them again (a table still missing on the fork is
    // left out by the wallet-safe check) and check once more. Still too large without it: WalletTxTooLargeError, nothing signed.
    if (simRes.value.err && lookupTableError(simRes.value.err)) {
      const routeTables = opts.lookupTableAddresses ?? [];
      await healLookupTables(lookupTables.map((t) => t.address), wallet);
      lookupTables = [...(await loadTables(routeTables)), ...lookupTables.filter((t) => !routeTables.includes(t.address))];
      if (opts.walletSafe && size() > MAX_TX_BYTES) throw new WalletTxTooLargeError(size(), opts.label);
      simRes = await run();
    }
    if (simRes.value.err && refresh && refreshable(simRes.value.logs)) {
      await refresh(true);
      simRes = await run();
    }
    if (simRes.value.err) throw new Error(simulationMessage(simRes.value, opts.label, lookupTables.map((t) => t.address)));
  }

  // The nonce value, else a fresh blockhash
  const recentBlockhash =
    nonceAccount && nonceValue
      ? nonceValue
      : (await rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>("getLatestBlockhash", [{ commitment: "confirmed" }])).value.blockhash;
  const { serialized: finalMsgBytes, message: finalMsg } = compileV0Message(payer, ixs, recentBlockhash, lookupTables);
  const unsignedTxBytes = serializeTransaction(finalMsgBytes, Array.from({ length: finalMsg.header.numRequiredSignatures }, () => new Uint8Array(64)));
  return { unsignedBase64: Buffer.from(unsignedTxBytes).toString("base64"), sponsor, label: opts.label, opts, tables: lookupTables.map((t) => t.address) };
}

/**
 * Simulation logs of a price or market copy that went stale on the fork (Vanna's oracles or Phoenix's mark price), worth one forced
 * refresh and another check. "PANICKED": Phoenix panics on a soft-stale mark for some positions instead of returning an error.
 */
const STALE_LOGS = /stale|oracle|price|PANICKED/i;

/**
 * FORK: Phoenix's matching engine could not resolve a resting order's maker. The market's orderbook is re-cloned from mainnet
 * before each trade, but Phoenix's trader arenas on the fork were cloned earlier (and hold the fork's own traders), so a maker who
 * joined mainnet since then points at a node the fork lacks ("Failed to lookup trader at index NodePointer(n)") or at a node whose
 * fork copy has no position in that market ("Traders view error: Position not found"); Phoenix returns InvalidAccountData.
 * Seen 2026-11-19 on META-PERP. The best orders on the book change from one re-clone to the next, so one more re-clone can help.
 */
const BOOK_DESYNC_LOGS = /Failed to lookup trader at index|Traders view error: Position not found/;
const refreshable = (logs: string[] | null) => {
  const text = (logs ?? []).join("\n");
  return STALE_LOGS.test(text) || BOOK_DESYNC_LOGS.test(text);
};

// `tables`: the message's lookup tables, named when the failure is a table the fork could not load.
function simulationMessage(value: { err: unknown; logs: string[] | null }, label?: string, tables?: string[]): string {
  const named = tables?.length && lookupTableError(value.err) ? ` (lookup tables: ${tables.join(", ")})` : "";
  const raw = `${label ? label + ": " : ""}simulation failed: ${JSON.stringify(value.err)}${named}\n${(value.logs ?? []).join("\n")}`;
  const decoded = decodeProgramError(raw);
  return decoded ? `${label ? label + ": " : ""}${decoded.message}` : raw.split("\n")[0];
}

/**
 * FORK CHECK, never signed or shown to a wallet: simulates these instructions as ONE transaction, however large (the wallet's
 * fork-only lookup table is written when the wallet-safe tables are not enough). A batch whose later part depends on an earlier
 * one (wrap USDC, then deposit + order) can only simulate that later part once the earlier one has landed; this checks the whole
 * batch up front instead, so nothing is signed or moved when, for example, the order would fail. Throws the decoded error.
 */
export async function simulateAsOne(
  instructions: RawInstruction[],
  payer: string,
  // `refresh`: when the check fails on a stale fork copy (a price, or a Phoenix orderbook out of step with the fork's trader
  // list), it is run forced and the check repeated once. The check itself is unchanged.
  opts: { computeUnits?: number; lookupTableAddresses?: string[]; label?: string; refresh?: (retry: boolean) => Promise<void> } = {},
): Promise<void> {
  const ixs = withComputeBudget(instructions, opts.computeUnits);
  const blank = "11111111111111111111111111111111";
  let tables: AddressLookupTableAccount[] = [];
  const build = () => {
    const { serialized, message } = compileV0Message(payer, ixs, blank, tables);
    return serializeTransaction(serialized, Array.from({ length: message.header.numRequiredSignatures }, () => new Uint8Array(64)));
  };
  let tx = build();
  // The wallet-safe tables, plus the fork-only table (written again) when they are not enough.
  const takeTables = async () => {
    tables = await walletSafeLookupTables(opts.lookupTableAddresses ?? [], payer);
    tx = build();
    if (tx.length > MAX_TX_BYTES) {
      tables = [...tables, ...(await fetchLookupTables([await writeForkLookupTable(payer, ixs, tables)]))];
      tx = build();
    }
  };
  await takeTables();
  const run = () =>
    rpc<{ value: { err: unknown; logs: string[] | null } }>("simulateTransaction", [
      Buffer.from(tx).toString("base64"),
      { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" },
    ]);
  let sim = await run();
  if (sim.value.err && lookupTableError(sim.value.err)) {
    await healLookupTables(tables.map((t) => t.address), payer);
    await takeTables();
    sim = await run();
  }
  if (sim.value.err && opts.refresh && refreshable(sim.value.logs)) {
    await opts.refresh(true);
    sim = await run();
  }
  if (sim.value.err) throw new Error(simulationMessage(sim.value, opts.label, tables.map((t) => t.address)));
}

/** Sends a signed transaction and waits for confirmation. `onLeg`: this part's sending / confirming moments. */
async function broadcastAndConfirm(prepared: PreparedTx, walletSigned: string, onLeg?: (phase: "sending" | "confirming", signature: string) => void): Promise<string> {
  const { opts, sponsor } = prepared;
  const signedBase64 = sponsor ? cosign(walletSigned, sponsor) : walletSigned;
  const fallbackSignature = base58(Buffer.from(signedBase64, "base64").subarray(1, 65));
  opts.onStatus?.("sending");
  onLeg?.("sending", fallbackSignature);
  emitTxStatus("sending");
  let sentSignature = fallbackSignature;
  try {
    const res = await rpc<string>("sendTransaction", [signedBase64, { encoding: "base64", skipPreflight: true, maxRetries: opts.maxRetries ?? 3 }]);
    if (res) sentSignature = res;
  } catch (error) {
    // If structured network failure, fallback signature is already valid and on its way
    const text = String(error);
    if (/SendTransactionError/i.test(text)) throw error;
    // The fork answers at once when the transaction can never land: say so instead of polling for a minute.
    if (/Blockhash ?not ?found|block height exceeded|signature verification|verification failed/i.test(text)) {
      throw new Error(`${opts.label ? opts.label + ": " : ""}${decodeProgramError(text)?.message ?? "The network refused the signed transaction. Nothing was sent. Please retry."}`);
    }
  }
  opts.onStatus?.("confirming");
  onLeg?.("confirming", sentSignature);
  emitTxStatus("confirming");
  await pollSignatureStatus(sentSignature, opts.timeoutMs ?? 60_000);
  return sentSignature;
}

/**
 * Main send pipeline ported from apps/solana/lib/solana/tx.ts:sendInstructions and broadcast.ts: compute budget, durable nonce,
 * lookup tables, simulation, the wallet's signature, broadcast (skipPreflight) and confirmation.
 */
export async function sendSolanaInstructions(instructions: RawInstruction[], opts: SendOptions = {}): Promise<string> {
  const prepared = await prepareTransaction(instructions, opts, 0, true);
  opts.onStatus?.("signing");
  emitTxStatus("waiting_for_wallet");
  if (opts.cancel?.aborted) throw new WalletCancelledError();
  const walletSigned = await signSolana(prepared.unsignedBase64, opts.cancel);
  return broadcastAndConfirm(prepared, walletSigned);
}

/** One transaction of a batch. `before` runs right before it is sent (after the earlier parts landed), e.g. to refresh fork prices. */
/**
 * One transaction of a batch. `before` runs after the wallet signed and right before this part is checked and sent (prices and
 * Phoenix market data on the fork age during a slow approval: it re-stamps them); it runs again with `retry` = true when the
 * check fails, before one more check.
 */
export type BatchPart = { instructions: RawInstruction[]; label: string; lookupTableAddresses?: string[]; before?: (retry: boolean) => Promise<void> };

/**
 * A later part of a batch failed after the earlier ones landed. `landed` are their signatures; each part is built so that what
 * landed is a safe state on its own, and the message says what the person has now.
 */
export class BatchPartError extends Error {
  readonly landed: string[];
  readonly failedIndex: number;
  readonly failedLabel: string;
  // An independent batch: every part that failed (the first is failedIndex / failedLabel).
  readonly failed: { index: number; label: string; message: string }[];
  /** Indexes of the parts that landed (same order as `landed`). */
  readonly landedIndex: number[];
  /** Indexes of the parts that were never sent (their signed copies were dropped). */
  readonly notSent: number[];
  constructor(
    message: string,
    landed: string[],
    failedIndex: number,
    failedLabel: string,
    failed?: { index: number; label: string; message: string }[],
    extra: { landedIndex?: number[]; notSent?: number[] } = {},
  ) {
    super(message);
    this.failedLabel = failedLabel;
    this.name = "BatchPartError";
    this.landed = landed;
    this.failedIndex = failedIndex;
    this.failed = failed ?? (failedIndex >= 0 ? [{ index: failedIndex, label: failedLabel, message }] : []);
    this.landedIndex = extra.landedIndex ?? [];
    this.notSent = extra.notSent ?? [];
  }
}

/**
 * The person stopped a batch after approving it (BatchOptions.stop): the parts already sent finished (`landed`, or `failed` when one
 * of them failed on its own), the parts not yet sent were never sent (`notSent`) and their signed copies were dropped. A retry
 * builds and signs the not-sent parts again (fresh durable nonces): the dropped copies can never land.
 */
export class StoppedError extends BatchPartError {
  constructor(landed: string[], failed: { index: number; label: string; message: string }[], extra: { landedIndex: number[]; notSent: number[] }) {
    const n = extra.notSent.length;
    super(`Stopped. ${landed.length} sent, ${n} not sent.`, landed, failed[0]?.index ?? -1, failed[0]?.label ?? "", failed, extra);
    this.name = "StoppedError";
  }
}

/** Where one part of a batch is (BatchOptions.onLeg). The chain side reports each moment as it really happens. */
export type LegPhase = "waiting" | "checking" | "sending" | "confirming" | "done" | "failed" | "not-sent";
export type LegInfo = { reason?: string; signature?: string };
/** `index`: the part's index in the batch (sendSolanaBatch) or in the whole run (sendSolanaStages). */
export type OnLeg = (index: number, phase: LegPhase, info?: LegInfo) => void;
/**
 * Whether a Stop can still hold anything back: true while some part has not left the phone (phase waiting, or checking: a part is
 * stopped right after its check). A single-stage batch sent all at once (Close all) goes from waiting to sending together, so there
 * is nothing to stop once it is approved. Pure.
 */
export const canStop = (phases: (LegPhase | undefined)[]): boolean => phases.some((p) => p === "waiting" || p === "checking");

/** Optional controls every multi-part send accepts (all backward compatible). */
export type BatchControl = {
  /** Per-part progress: waiting (signed, its turn not come), checking, sending, confirming, done, failed, not-sent. */
  onLeg?: OnLeg;
  /** Aborted while the wallet has not answered: the wallet request is abandoned and the send rejects with WalletCancelledError
   *  ("Cancelled. Nothing was sent."). Nothing is sent, even if the wallet answers later. */
  cancel?: AbortSignal;
  /** Aborted after the wallet approved: parts already sent finish and confirm, parts not yet sent are never sent (StoppedError). */
  stop?: AbortSignal;
};

export type BatchOptions = Omit<SendOptions, "label"> & BatchControl & {
  // No part depends on another (e.g. Close all: reduce-only orders on different markets, each with its own durable nonce): every
  // part is simulated before the wallet is asked, and after signing all are re-checked, sent and confirmed together.
  independent?: boolean;
  // With `independent`: refreshes the fork data of EVERY part in one pass (shared reads, one price stamp), used instead of running
  // each part's `before` separately. Concurrent forced refreshes from several failing checks share one run.
  refreshAll?: (retry: boolean) => Promise<void>;
};

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** One shared run per `retry` value while it is in flight: parts that fail their check at the same time trigger ONE refresh. */
function sharedRefresh(fn: (retry: boolean) => Promise<void>): (retry: boolean) => Promise<void> {
  const inflight = new Map<boolean, Promise<void>>();
  return (retry) => {
    let p = inflight.get(retry);
    if (!p) {
      p = fn(retry).finally(() => inflight.delete(retry));
      inflight.set(retry, p);
    }
    return p;
  };
}

/** How many transactions one wallet approval may carry (sendSolanaStages splits a longer run into the fewest approvals). Phantom has
 *  been tested with 4 in one request; 8 is the planned ceiling. */
export const MAX_TX_PER_APPROVAL = 8;

/**
 * Splits `count` transactions into the fewest approvals of at most `max` each, as even as possible, keeping the order:
 * chunkIndexes(10, 8) = [[0..4], [5..9]]. Pure (unit-tested offline).
 */
export function chunkIndexes(count: number, max: number = MAX_TX_PER_APPROVAL): number[][] {
  if (count <= 0) return [];
  const m = Math.max(1, Math.floor(max));
  const n = Math.ceil(count / m);
  const base = Math.floor(count / n);
  const extra = count % n;
  const out: number[][] = [];
  let at = 0;
  for (let c = 0; c < n; c++) {
    const size = base + (c < extra ? 1 : 0);
    out.push(Array.from({ length: size }, (_, k) => at + k));
    at += size;
  }
  return out;
}

/**
 * The check of one signed part right before it is sent (its fork data refreshed by the caller first): simulation of the exact signed
 * bytes, with the fork repairs (stale DEX pools, lookup tables) and up to two forced refreshes for a stale price. Throws the decoded
 * error. A signed part that failed its check was never sent, so its durable nonce is unchanged.
 */
async function checkSignedPart(
  part: BatchPart,
  prepared: PreparedTx,
  signed: string,
  refresh: ((retry: boolean) => Promise<void>) | undefined,
  mark: (what: string) => void,
  n: number,
): Promise<void> {
  const signedBase64 = prepared.sponsor ? cosign(signed, prepared.sponsor) : signed;
  const simulate = () =>
    rpc<{ value: { err: unknown; logs: string[] | null } }>("simulateTransaction", [
      signedBase64,
      { encoding: "base64", sigVerify: false, replaceRecentBlockhash: false, commitment: "confirmed" },
    ]);
  let sim = await simulate();
  // The fork's copy of a swap pool can drift from mainnet (the route was quoted on mainnet): re-clone and check again.
  if (sim.value.err && (await healStaleDexPools(part.instructions, part.lookupTableAddresses ?? [])) > 0) sim = await simulate();
  // A lookup table the fork could not load (the signed message keeps its tables): read / re-clone them and check again.
  if (sim.value.err && lookupTableError(sim.value.err)) {
    await healLookupTables(prepared.tables, prepared.opts.payer);
    sim = await simulate();
    mark(`part ${n} re-checked after re-reading its lookup tables (${sim.value.err ? "still failing" : "ok"})`);
  }
  // A price that went stale between the refresh and the check: refresh once more (forced) and check again; a second try only for a
  // price/oracle that is still stale (the fork's refresh can take 15 s).
  for (let tries = 0; sim.value.err && refresh && tries < 2; tries++) {
    if (tries === 1 && !refreshable(sim.value.logs)) break;
    await refresh(true);
    sim = await simulate();
    mark(`part ${n} re-checked after a forced refresh (${sim.value.err ? "still failing" : "ok"})`);
  }
  if (sim.value.err) throw new Error(simulationMessage(sim.value, part.label, prepared.tables));
  mark(`part ${n} simulated`);
}

/** Signs in one wallet request; `cancel` abandons the request (WalletCancelledError from sign.ts, nothing is sent). */
function signAll(unsigned: string[], cancel?: AbortSignal): Promise<string[]> {
  return unsigned.length === 1 ? signSolana(unsigned[0], cancel).then((s) => [s]) : signSolanaBatch(unsigned, cancel);
}

/** Calls a progress listener; a listener that throws never breaks the send. */
const safeLeg = (onLeg: OnLeg | undefined) => (i: number, phase: LegPhase, info?: LegInfo) => {
  try {
    onLeg?.(i, phase, info);
  } catch {
    // ignored
  }
};

/**
 * Several transactions behind ONE wallet approval: all are built (each with its own durable nonce, wallet-safe lookup tables
 * only, so the wallet can read every one), signed in one sign_transactions request, then sent in order, each confirmed before
 * the next. Only the first can be simulated before signing; every part is simulated again right before it is sent (after its
 * `before` refresh), and a failure there stops the batch with a BatchPartError (nothing after it is sent). Returns the last signature.
 *
 * Controls (BatchControl, all optional): `onLeg` reports each part's moments; `cancel` abandons the wallet request (nothing sent,
 * WalletCancelledError); `stop` after the approval sends nothing more (parts in flight finish; StoppedError lists what landed).
 */
// `check` (optional): a whole-batch check (e.g. simulateAsOne of every part's instructions together). It runs while the parts are
// built, before the wallet is asked, and again right before the first part is sent when the approval was slow; when it throws,
// nothing is signed or sent.
export async function sendSolanaBatch(parts: BatchPart[], batchOpts: BatchOptions = {}, check?: () => Promise<void>): Promise<string> {
  const { independent: indep, refreshAll: refreshAllRaw, onLeg, cancel, stop, ...opts } = batchOpts;
  const independent = !!indep && parts.length > 1;
  // Development builds only: where the time goes, from the tap to the last confirmation (read with `adb logcat -s ReactNativeJS`).
  const t0 = Date.now();
  const mark = (what: string) => {
    if (__DEV__) console.log(`[tx-time] ${((Date.now() - t0) / 1000).toFixed(1)}s ${what}`);
  };
  const leg = safeLeg(onLeg);
  const refreshAll = refreshAllRaw ? sharedRefresh(refreshAllRaw) : undefined;
  // The refresh a part's check uses: the batch-wide one for an independent batch that has it, else the part's own.
  const refreshFor = (i: number) => (independent && refreshAll ? refreshAll : parts[i].before);
  // Independent per part (own nonce account, own tables): built in parallel, with the whole-batch check. Only the first part can be
  // simulated before signing when the later ones depend on it; in an independent batch every part is.
  const [prepared] = await Promise.all([
    Promise.all(
      parts.map((part, i) =>
        prepareTransaction(
          part.instructions,
          { ...opts, label: part.label, lookupTableAddresses: part.lookupTableAddresses ?? opts.lookupTableAddresses, walletSafe: true },
          i,
          independent || i === 0,
          independent || i === 0 ? refreshFor(i) : undefined,
        ),
      ),
    ),
    check?.().then(() => mark("whole batch checked")),
  ]);
  mark(`built ${parts.length} part(s)${independent ? " (independent: checked, sent and confirmed together)" : ""}: ${parts.map((p) => p.label).join(" | ")}`);
  if (cancel?.aborted) throw new WalletCancelledError();
  opts.onStatus?.("signing");
  emitTxStatus("waiting_for_wallet");
  const signStart = Date.now();
  // The copied prices are stamped for the fork's clock and run out ~65 s later. A slow approval would then start with a refresh that
  // costs 25-40 s on a slow device, so while the wallet is still being waited on (20 s in) the first part's refresh runs in the
  // background: when the answer comes, the stamps are young and nothing waits. A quick answer cancels it. Harmless if it fails.
  const keepFresh = setTimeout(() => void refreshFor(0)?.(true).then(() => mark("refreshed while waiting for the wallet")).catch(() => undefined), 20_000);
  let signedTxs: string[];
  try {
    signedTxs = await signAll(prepared.map((p) => p.unsignedBase64), cancel);
  } finally {
    clearTimeout(keepFresh);
  }
  mark("wallet answered");
  parts.forEach((_, i) => leg(i, "waiting"));
  // The first part was simulated just before signing: when the wallet answered quickly, nothing aged, so it is sent at once.
  const quick = Date.now() - signStart < 15_000;
  // Stop / failure: the signed copies of parts not yet sent are dropped (never logged or kept).
  const drop = (i: number) => {
    signedTxs[i] = "";
    leg(i, "not-sent");
  };

  if (independent) {
    // Every part was simulated just before signing. After a slow approval, all parts' fork data is refreshed (in one pass when the
    // batch has refreshAll) and the whole batch checked again; then each part is checked, sent and confirmed, all at the same time.
    if (!quick && !stop?.aborted) {
      if (refreshAll) await refreshAll(false);
      else await Promise.all(parts.map((p) => p.before?.(false)));
      mark(`all ${parts.length} parts refreshed`);
      if (check) {
        await check();
        mark("whole batch checked again");
      }
    }
    const notSent: number[] = [];
    const results = await Promise.allSettled(
      parts.map(async (part, i) => {
        if (!quick && !stop?.aborted) {
          leg(i, "checking");
          await checkSignedPart(part, prepared[i], signedTxs[i], refreshFor(i), mark, i + 1);
        }
        // Stop is honoured up to the moment a part leaves the phone.
        if (stop?.aborted) {
          notSent.push(i);
          drop(i);
          return "";
        }
        const sig = await broadcastAndConfirm(prepared[i], signedTxs[i], (ph, s) => leg(i, ph, { signature: s }));
        leg(i, "done", { signature: sig });
        mark(`part ${i + 1} confirmed${quick ? " (sent at once)" : ""}`);
        return sig;
      }),
    );
    results.forEach((r, i) => {
      if (r.status === "rejected") leg(i, "failed", { reason: errText(r.reason) });
    });
    const landedIndex = results.flatMap((r, i) => (r.status === "fulfilled" && r.value ? [i] : []));
    const landed = landedIndex.map((i) => (results[i] as PromiseFulfilledResult<string>).value);
    const failed = results.flatMap((r, i) => (r.status === "rejected" ? [{ index: i, label: parts[i].label, message: errText(r.reason) }] : []));
    mark(`independent batch settled: ${landed.length} landed, ${failed.length} failed, ${notSent.length} not sent`);
    if (notSent.length) throw new StoppedError(landed, failed, { landedIndex, notSent: notSent.sort((a, b) => a - b) });
    if (!failed.length) return landed[landed.length - 1];
    // Nothing landed: the first part's own error, as for a single transaction.
    if (!landed.length) throw (results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason;
    throw new BatchPartError(failed.map((f) => f.message).join(" | "), landed, failed[0].index, failed[0].label, failed, { landedIndex });
  }

  const landed: string[] = [];
  const stopAt = (i: number): never => {
    const notSent = parts.map((_, k) => k).filter((k) => k >= i);
    notSent.forEach(drop);
    mark(`stopped before part ${i + 1}: ${notSent.length} not sent`);
    throw new StoppedError([...landed], [], { landedIndex: landed.map((_, k) => k), notSent });
  };
  for (let i = 0; i < parts.length; i++) {
    if (stop?.aborted) stopAt(i);
    try {
      // Every part, the first included, is checked again right before it is sent: the approval may have taken minutes.
      if (i === 0 && quick) {
        landed.push(await broadcastAndConfirm(prepared[i], signedTxs[i], (ph, s) => leg(i, ph, { signature: s })));
        leg(i, "done", { signature: landed[i] });
        mark(`part ${i + 1} confirmed (sent at once)`);
        continue;
      }
      leg(i, "checking");
      await parts[i].before?.(false);
      mark(`part ${i + 1} refreshed`);
      // A slow approval: the whole batch is checked again before anything is sent (prices may have moved meanwhile).
      if (i === 0 && check && parts.length > 1) {
        await check();
        mark("whole batch checked again");
      }
      await checkSignedPart(parts[i], prepared[i], signedTxs[i], refreshFor(i), mark, i + 1);
    } catch (e) {
      leg(i, "failed", { reason: errText(e) });
      for (let k = i + 1; k < parts.length; k++) drop(k);
      if (i === 0) throw e;
      throw new BatchPartError(errText(e), landed, i, parts[i].label, undefined, { landedIndex: landed.map((_, k) => k), notSent: parts.map((_, k) => k).filter((k) => k > i) });
    }
    if (stop?.aborted) stopAt(i);
    try {
      landed.push(await broadcastAndConfirm(prepared[i], signedTxs[i], (ph, s) => leg(i, ph, { signature: s })));
      leg(i, "done", { signature: landed[i] });
      mark(`part ${i + 1} confirmed`);
    } catch (e) {
      leg(i, "failed", { reason: errText(e) });
      for (let k = i + 1; k < parts.length; k++) drop(k);
      if (i === 0) throw e;
      throw new BatchPartError(errText(e), landed, i, parts[i].label, undefined, { landedIndex: landed.map((_, k) => k), notSent: parts.map((_, k) => k).filter((k) => k > i) });
    }
  }
  return landed[landed.length - 1];
}

/** One transaction of a staged run (sendSolanaStages): the parts of one `stage` are sent together, a later stage waits for them. */
export type StagedPart = BatchPart & { stage: number };

/**
 * A run of transactions in stages, signed up front and sent stage by stage. Every part is built (its own durable nonce and
 * wallet-safe tables) and the first stage simulated; then all parts are signed in the fewest wallet approvals of at most
 * `maxPerApproval` (MAX_TX_PER_APPROVAL; the approvals are asked for one after another, before anything is sent). Then stage by
 * stage: the parts of a stage are checked (simulation of the signed bytes right before sending, after the part's `before`
 * refresh), sent and confirmed together; the next stage starts only when every part of this one landed and `between(stage)` (e.g.
 * a chain read that the stage did what it should) passed. A failure, a failed `between` or a Stop ends the run: nothing after it is
 * sent and the signed copies are dropped. Throws BatchPartError / StoppedError with `landedIndex`, `failed`, `notSent` (indexes
 * into `parts`). Returns the signatures by part index.
 */
export async function sendSolanaStages(
  parts: StagedPart[],
  batchOpts: Omit<BatchOptions, "independent" | "refreshAll"> & { maxPerApproval?: number; between?: (stage: number) => Promise<void> } = {},
): Promise<string[]> {
  const { onLeg, cancel, stop, maxPerApproval, between, ...opts } = batchOpts;
  if (!parts.length) return [];
  const t0 = Date.now();
  const mark = (what: string) => {
    if (__DEV__) console.log(`[tx-time] ${((Date.now() - t0) / 1000).toFixed(1)}s ${what}`);
  };
  const leg = safeLeg(onLeg);
  const stages = [...new Set(parts.map((p) => p.stage))].sort((a, b) => a - b);
  const first = stages[0];
  const prepared = await Promise.all(
    parts.map((part, i) =>
      prepareTransaction(
        part.instructions,
        { ...opts, label: part.label, lookupTableAddresses: part.lookupTableAddresses ?? opts.lookupTableAddresses, walletSafe: true },
        i,
        part.stage === first,
        part.stage === first ? part.before : undefined,
      ),
    ),
  );
  const chunks = chunkIndexes(parts.length, maxPerApproval ?? MAX_TX_PER_APPROVAL);
  mark(`built ${parts.length} part(s) in ${stages.length} stage(s), ${chunks.length} approval(s): ${parts.map((p) => `[${p.stage}] ${p.label}`).join(" | ")}`);
  const signed: string[] = new Array(parts.length).fill("");
  const signStart = Date.now();
  for (const [c, idx] of chunks.entries()) {
    if (cancel?.aborted) throw new WalletCancelledError();
    opts.onStatus?.("signing");
    emitTxStatus("waiting_for_wallet");
    const out = await signAll(idx.map((i) => prepared[i].unsignedBase64), cancel);
    idx.forEach((i, k) => (signed[i] = out[k]));
    mark(`approval ${c + 1} of ${chunks.length} answered (${idx.length} tx)`);
  }
  parts.forEach((_, i) => leg(i, "waiting"));
  const quick = Date.now() - signStart < 15_000;
  const landedIndex: number[] = [];
  const sigs: string[] = new Array(parts.length).fill("");
  // Drops the signed copies of every part of `stage` and later that has not been sent (never logged or kept).
  const dropFrom = (stage: number, exclude: number[] = []) => {
    const out: number[] = [];
    parts.forEach((p, i) => {
      if (p.stage >= stage && !exclude.includes(i) && !sigs[i]) {
        signed[i] = "";
        leg(i, "not-sent");
        out.push(i);
      }
    });
    return out;
  };
  for (const stage of stages) {
    if (stop?.aborted) {
      const notSent = dropFrom(stage);
      mark(`stopped before stage ${stage}: ${notSent.length} not sent`);
      throw new StoppedError(landedIndex.map((i) => sigs[i]), [], { landedIndex: [...landedIndex], notSent });
    }
    const idx = parts.map((p, i) => (p.stage === stage ? i : -1)).filter((i) => i >= 0);
    mark(`stage ${stage}: ${idx.map((i) => parts[i].label).join(" | ")}`);
    // Parts that share a refresh (e.g. every Perps close refreshes all markets) run it once.
    const befores = [...new Set(idx.map((i) => parts[i].before).filter((b): b is (retry: boolean) => Promise<void> => !!b))];
    const refresh = sharedRefresh(async (retry: boolean) => void (await Promise.all(befores.map((b) => b(retry)))));
    const stoppedHere: number[] = [];
    const results = await Promise.allSettled(
      idx.map(async (i) => {
        if (!(stage === first && quick)) {
          leg(i, "checking");
          await (idx.length > 1 ? refresh(false) : parts[i].before?.(false));
          await checkSignedPart(parts[i], prepared[i], signed[i], idx.length > 1 ? refresh : parts[i].before, mark, i + 1);
        }
        if (stop?.aborted) {
          stoppedHere.push(i);
          return "";
        }
        const sig = await broadcastAndConfirm(prepared[i], signed[i], (ph, s) => leg(i, ph, { signature: s }));
        sigs[i] = sig;
        landedIndex.push(i);
        leg(i, "done", { signature: sig });
        mark(`part ${i + 1} confirmed`);
        return sig;
      }),
    );
    const failed = results.flatMap((r, k) => (r.status === "rejected" ? [{ index: idx[k], label: parts[idx[k]].label, message: errText(r.reason) }] : []));
    failed.forEach((f) => leg(f.index, "failed", { reason: f.message }));
    if (failed.length || stoppedHere.length) {
      const notSent = dropFrom(stage, failed.map((f) => f.index));
      mark(`stage ${stage} ended the run: ${failed.length} failed, ${notSent.length} not sent`);
      const landed = landedIndex.map((i) => sigs[i]);
      if (!failed.length) throw new StoppedError(landed, [], { landedIndex: [...landedIndex], notSent });
      throw new BatchPartError(failed.map((f) => f.message).join(" | "), landed, failed[0].index, failed[0].label, failed, { landedIndex: [...landedIndex], notSent });
    }
    if (between && stage !== stages[stages.length - 1]) {
      try {
        await between(stage);
      } catch (e) {
        const notSent = dropFrom(stage + 1);
        mark(`check after stage ${stage} ended the run: ${errText(e)}`);
        throw new BatchPartError(errText(e), landedIndex.map((i) => sigs[i]), -1, "", [], { landedIndex: [...landedIndex], notSent });
      }
    }
  }
  return sigs;
}

/**
 * FORK: writes a fresh value into this wallet's first `count` durable-nonce accounts, so any transaction signed earlier with them
 * (a run that stopped, failed, or whose confirmation timed out) can never land afterwards. A retry calls this before it reads the
 * chain, so what it reads is final.
 */
export async function retireForkNonces(wallet: string, count: number): Promise<void> {
  await Promise.all(Array.from({ length: Math.max(1, count) }, (_, slot) => writeForkNonce(wallet, forkNonceAddress(wallet, slot))));
}

/** Which of these signatures the chain shows as landed without an error (searching history); "" counts as not landed. */
export async function signaturesLanded(signatures: string[]): Promise<boolean[]> {
  const sigs = signatures.filter(Boolean);
  if (!sigs.length) return signatures.map(() => false);
  const res = await rpc<{ value: ({ err: unknown; confirmationStatus?: string } | null)[] }>("getSignatureStatuses", [sigs, { searchTransactionHistory: true }]);
  const ok = new Map(sigs.map((s, i) => [s, !!res.value[i] && !res.value[i]!.err && (res.value[i]!.confirmationStatus === "confirmed" || res.value[i]!.confirmationStatus === "finalized")]));
  return signatures.map((s) => (s ? ok.get(s) ?? false : false));
}
