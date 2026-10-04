import { type AddressLookupTableAccount, type Connection, type PublicKey, SendTransactionError, type TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

import { lastValidHeightOf } from "./fresh-blockhash";
import { healStaleDexPools } from "./heal-pools";

const POLL_MS = 700;
const SEND_ATTEMPTS = 3;
const MAX_POLL_FAILURES = 8;
const RATE_LIMIT_PAUSE_MS = 1500;

export class TransactionFailedError extends Error {
  constructor(readonly detail: string) {
    super(detail);
    this.name = "TransactionFailedError";
  }
}

export class BlockhashExpiredError extends Error {
  constructor() {
    super("The transaction expired before it was confirmed.");
    this.name = "BlockhashExpiredError";
  }
}

export class ConfirmationLostError extends Error {
  constructor(readonly signature: string) {
    super("The connection dropped before the transaction was confirmed.");
    this.name = "ConfirmationLostError";
  }
}

const NETWORK_FAILURE = /fetch failed|network request failed|UnknownHost|timed out|timeout|ECONN|ENOTFOUND/i;
// The fork fetches accounts it has not seen from its upstream provider, which can answer "429 Too Many Requests". Nothing
// has landed when that happens, so asking again a moment later is safe and usually works.
const RATE_LIMITED = /429|Too Many Requests/i;

export function isRateLimited(text: string): boolean {
  return RATE_LIMITED.test(text);
}

export function isNetworkFailure(error: unknown): boolean {
  return error instanceof Error && NETWORK_FAILURE.test(error.message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The wallet only signs. The signed transaction is sent to our fork RPC here, never through the wallet's own RPC
// (which would be mainnet), and confirmed over plain HTTP because the fork does not serve websockets reliably.
async function sendRaw(connection: Connection, raw: Uint8Array): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await connection.sendRawTransaction(raw, { skipPreflight: false, preflightCommitment: "confirmed" });
    } catch (error) {
      // The send's own check carries the program logs, which is where the reason for a refusal is.
      if (error instanceof SendTransactionError) {
        const detail = `${error.message} ${(error.logs ?? []).join(" ")}`;
        if (attempt < SEND_ATTEMPTS && isRateLimited(detail)) {
          await sleep(RATE_LIMIT_PAUSE_MS * attempt);
          continue;
        }
        throw new TransactionFailedError(detail);
      }
      if (attempt >= SEND_ATTEMPTS || !isNetworkFailure(error)) throw error;
      await sleep(POLL_MS * attempt * 2);
    }
  }
}

async function confirmationState(connection: Connection, signature: string, lastValidBlockHeight: number): Promise<"confirmed" | "processed" | "pending" | "expired"> {
  const { value } = await connection.getSignatureStatuses([signature]);
  const status = value[0];
  if (status?.err) throw new TransactionFailedError(JSON.stringify(status.err));
  if (status && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) return "confirmed";
  if (status) return "processed";
  return (await connection.getBlockHeight("confirmed")) > lastValidBlockHeight ? "expired" : "pending";
}

// A brief connection drop must not turn into a failure once the transaction is already on its way: the poll keeps
// going, and only a sustained outage is reported, as an unknown outcome rather than a failed send.
export async function sendAndConfirm(
  connection: Connection,
  signed: VersionedTransaction,
  lastValidBlockHeight: number,
  stages: { onSent?: (signature: string) => void; onProcessed?: () => void } = {},
): Promise<string> {
  const signature = await sendRaw(connection, signed.serialize());
  const lastValid = lastValidHeightOf(signed.message.recentBlockhash, lastValidBlockHeight);
  stages.onSent?.(signature);

  let announcedProcessed = false;
  let failures = 0;
  for (;;) {
    try {
      const state = await confirmationState(connection, signature, lastValid);
      if (state === "confirmed") return signature;
      if (state === "expired") throw new BlockhashExpiredError();
      if (state === "processed" && !announcedProcessed) {
        announcedProcessed = true;
        stages.onProcessed?.();
      }
      failures = 0;
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      if (++failures >= MAX_POLL_FAILURES) throw new ConfirmationLostError(signature);
    }
    await sleep(POLL_MS);
  }
}

export type SigningHooks = {
  sign: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
  // Several transactions approved in one wallet prompt.
  signAll: (transactions: VersionedTransaction[]) => Promise<VersionedTransaction[]>;
  // Called when the transaction is built and checked, right before the wallet is asked to sign.
  onPrepared?: () => void;
  onSigned: () => void;
  onSent?: (signature: string) => void;
  onProcessed?: () => void;
};

// Simulating first surfaces a bad instruction or route before the wallet is asked to sign anything.
async function simulate(connection: Connection, transaction: VersionedTransaction) {
  for (let attempt = 1; ; attempt++) {
    try {
      const simulation = await connection.simulateTransaction(transaction, { sigVerify: false, commitment: "confirmed" });
      const detail = `${JSON.stringify(simulation.value.err)} ${simulation.value.logs?.join(" ") ?? ""}`;
      if (simulation.value.err && attempt < SEND_ATTEMPTS && isRateLimited(detail)) {
        await sleep(RATE_LIMIT_PAUSE_MS * attempt);
        continue;
      }
      return simulation;
    } catch (error) {
      if (attempt >= SEND_ATTEMPTS || !(error instanceof Error && isRateLimited(error.message))) throw error;
      await sleep(RATE_LIMIT_PAUSE_MS * attempt);
    }
  }
}

export async function simulateSignAndSend(connection: Connection, transaction: VersionedTransaction, lastValidBlockHeight: number, hooks: SigningHooks): Promise<string> {
  let simulation = await simulate(connection, transaction);
  // A pool the fork cloned earlier can fail a fresh quote in several ways, so any failed simulation tries the re-clone
  // once; it only does anything when a stale-prone pool is part of the transaction.
  if (simulation.value.err && (await healStaleDexPools(connection, transaction)) > 0) {
    simulation = await simulate(connection, transaction);
  }
  if (simulation.value.err) throw new TransactionFailedError(`${JSON.stringify(simulation.value.err)} ${simulation.value.logs?.join(" ") ?? ""}`);

  hooks.onPrepared?.();
  const signed = await hooks.sign(transaction);
  hooks.onSigned();
  return sendAndConfirm(connection, signed, lastValidBlockHeight, hooks);
}

export async function sendInstructions(
  connection: Connection,
  payer: PublicKey,
  instructions: TransactionInstruction[],
  hooks: SigningHooks,
  tables: AddressLookupTableAccount[] = [],
): Promise<string> {
  const latest = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({ payerKey: payer, recentBlockhash: latest.blockhash, instructions }).compileToV0Message(tables);
  return simulateSignAndSend(connection, new VersionedTransaction(message), latest.lastValidBlockHeight, hooks);
}
