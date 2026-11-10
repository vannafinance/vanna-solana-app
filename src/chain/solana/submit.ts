// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\tx.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\broadcast.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\confirmation.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\errors.ts

import { Buffer } from "buffer";

import { signSolana, requireActiveRealWallet } from "@/chain/sign";
import { VANNA_PROGRAM_ID } from "./config";
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
  onStatus?: (status: "simulating" | "signing" | "sending" | "confirming") => void;
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

const CODE_TO_NAME: Record<number, string> = {
  6000: "Unauthorized",
  6004: "ProtocolActionPaused",
  6013: "AssetNotCollateralEnabled",
  6014: "AssetNotBorrowEnabled",
  6015: "SupplyCapExceeded",
  6016: "BorrowCapExceeded",
  6017: "InsufficientLiquidity",
  6018: "InsufficientCollateral",
  6019: "InsufficientShares",
  6020: "SlippageExceeded",
  6021: "TooManyAssets",
  6023: "IncompletePositionAccounts",
  6024: "StalePrice",
  6025: "ConfidenceTooWide",
  6026: "HealthFactorTooLow",
  6029: "OutstandingDebt",
  6036: "ZeroAmount",
  6041: "BelowMinimumInitialSupply",
};

/**
 * Ported from apps/solana/lib/solana/errors.ts:decodeProgramError
 */
export function decodeProgramError(text: string): { name: string; message: string } | null {
  const anchor = /Error Code: (\w+)\. Error Number: (\d+)\. Error Message: ([^\n]+?)\.?(?:\n|$)/.exec(text);
  if (anchor) {
    const name = anchor[1];
    return { name, message: FRIENDLY_ERRORS[name] ?? anchor[3] };
  }
  const custom = /custom program error: (0x[0-9a-f]+)/i.exec(text) ?? /"Custom":(\d+)/.exec(text);
  if (custom) {
    const code = custom[1].startsWith("0x") ? parseInt(custom[1], 16) : Number(custom[1]);
    const name = CODE_TO_NAME[code];
    if (name) return { name, message: FRIENDLY_ERRORS[name] ?? name };
    if (code === 1) return { name: "InsufficientFunds", message: "Insufficient token balance for this transfer." };
  }
  for (const [name, msg] of Object.entries(FRIENDLY_ERRORS)) {
    if (text.includes(name)) return { name, message: msg };
  }
  if (/insufficient lamports|insufficient funds for fee/i.test(text)) {
    return { name: "InsufficientLamports", message: "Not enough SOL to pay for this transaction. Use the faucet to top up." };
  }
  if (/Blockhash not found|block height exceeded/i.test(text)) {
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
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Confirmation timed out for ${signature}. Check transaction status before retrying.`);
}

// ---------------------------------------------------------------------------------------------
// The Unified Send Pipeline
// ---------------------------------------------------------------------------------------------

/**
 * Main send pipeline ported from apps/solana/lib/solana/tx.ts:sendInstructions and broadcast.ts:
 * 1. Prepend ComputeBudgetProgram (units limit + 256 KiB heap frame if Vanna invoked)
 * 2. Fetch Address Lookup Tables if specified
 * 3. Compile to Versioned V0 Message with placeholder blockhash
 * 4. Simulate with replaceRecentBlockhash: true (surfacing decoded error logs on failure)
 * 5. Fetch fresh blockhash right before signing
 * 6. Sign via signSolana(base64Tx)
 * 7. Extract first signature (bytes 1..65) as fallback ID
 * 8. Broadcast with skipPreflight: true and maxRetries
 * 9. Poll getSignatureStatuses until confirmed or finalized
 */
export async function sendSolanaInstructions(
  instructions: RawInstruction[],
  opts: SendOptions = {}
): Promise<string> {
  const payer = opts.payer ?? requireActiveRealWallet("solana").full;
  const ixs = withComputeBudget(instructions, opts.computeUnits);

  let lookupTables: AddressLookupTableAccount[] = [];
  if (opts.lookupTableAddresses && opts.lookupTableAddresses.length > 0) {
    lookupTables = await fetchLookupTables(opts.lookupTableAddresses);
  }

  // 1. Simulation Phase (placeholder blockhash)
  const placeholderHash = "11111111111111111111111111111111";
  const { serialized: simMsgBytes } = compileV0Message(payer, ixs, placeholderHash, lookupTables);
  const simTxBytes = serializeTransaction(simMsgBytes, [new Uint8Array(64)]);
  const simBase64 = Buffer.from(simTxBytes).toString("base64");

  opts.onStatus?.("simulating");
  const simRes = await rpc<{
    value: {
      err: unknown;
      logs: string[] | null;
    };
  }>("simulateTransaction", [
    simBase64,
    { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" },
  ]);

  if (simRes.value.err) {
    const logs = simRes.value.logs ?? [];
    const raw = `${opts.label ? opts.label + ": " : ""}simulation failed: ${JSON.stringify(simRes.value.err)}\n${logs.join("\n")}`;
    const decoded = decodeProgramError(raw);
    throw new Error(decoded ? `${opts.label ? opts.label + ": " : ""}${decoded.message}` : raw.split("\n")[0]);
  }

  // 2. Fetch fresh blockhash
  const latest = await rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>(
    "getLatestBlockhash",
    [{ commitment: "confirmed" }]
  );

  // 3. Re-compile with fresh blockhash
  const { serialized: finalMsgBytes } = compileV0Message(payer, ixs, latest.value.blockhash, lookupTables);
  const unsignedTxBytes = serializeTransaction(finalMsgBytes, [new Uint8Array(64)]);
  const unsignedBase64 = Buffer.from(unsignedTxBytes).toString("base64");

  // 4. Sign
  opts.onStatus?.("signing");
  const signedBase64 = await signSolana(unsignedBase64);

  // 5. Extract fallback signature (first 64-byte signature slot at offset 1)
  const signedBytes = Buffer.from(signedBase64, "base64");
  const fallbackSignature = base58(signedBytes.subarray(1, 65));

  // 6. Broadcast
  opts.onStatus?.("sending");
  let sentSignature = fallbackSignature;
  try {
    const res = await rpc<string>("sendTransaction", [
      signedBase64,
      { encoding: "base64", skipPreflight: true, maxRetries: opts.maxRetries ?? 3 },
    ]);
    if (res) sentSignature = res;
  } catch (error) {
    // If structured network failure, fallback signature is already valid and on its way
    const text = String(error);
    if (/SendTransactionError/i.test(text)) throw error;
  }

  // 7. Confirm
  opts.onStatus?.("confirming");
  await pollSignatureStatus(sentSignature, opts.timeoutMs ?? 60_000);
  return sentSignature;
}
