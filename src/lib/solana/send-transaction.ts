import { type AddressLookupTableAccount, type Connection, type PublicKey, type TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

const POLL_MS = 700;
const SEND_ATTEMPTS = 3;
const MAX_POLL_FAILURES = 8;

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
      if (attempt >= SEND_ATTEMPTS || !isNetworkFailure(error)) throw error;
      await sleep(POLL_MS * attempt * 2);
    }
  }
}

async function confirmationState(connection: Connection, signature: string, lastValidBlockHeight: number): Promise<"confirmed" | "pending" | "expired"> {
  const { value } = await connection.getSignatureStatuses([signature]);
  const status = value[0];
  if (status?.err) throw new TransactionFailedError(JSON.stringify(status.err));
  if (status && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) return "confirmed";
  return (await connection.getBlockHeight("confirmed")) > lastValidBlockHeight ? "expired" : "pending";
}

// A brief connection drop must not turn into a failure once the transaction is already on its way: the poll keeps
// going, and only a sustained outage is reported, as an unknown outcome rather than a failed send.
export async function sendAndConfirm(connection: Connection, signed: VersionedTransaction, lastValidBlockHeight: number): Promise<string> {
  const signature = await sendRaw(connection, signed.serialize());

  let failures = 0;
  for (;;) {
    try {
      const state = await confirmationState(connection, signature, lastValidBlockHeight);
      if (state === "confirmed") return signature;
      if (state === "expired") throw new BlockhashExpiredError();
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
  onSigned: () => void;
};

// Simulating first surfaces a bad instruction or route before the wallet is asked to sign anything.
export async function simulateSignAndSend(connection: Connection, transaction: VersionedTransaction, lastValidBlockHeight: number, hooks: SigningHooks): Promise<string> {
  const simulation = await connection.simulateTransaction(transaction, { sigVerify: false, commitment: "confirmed" });
  if (simulation.value.err) throw new TransactionFailedError(`${JSON.stringify(simulation.value.err)} ${simulation.value.logs?.join(" ") ?? ""}`);

  const signed = await hooks.sign(transaction);
  hooks.onSigned();
  return sendAndConfirm(connection, signed, lastValidBlockHeight);
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
