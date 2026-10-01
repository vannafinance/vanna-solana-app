import type { Connection, VersionedTransaction } from "@solana/web3.js";

const POLL_MS = 700;

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The wallet only signs. The signed transaction is sent to our fork RPC here, never through the wallet's own RPC
// (which would be mainnet), and confirmed over plain HTTP because the fork does not serve websockets reliably.
export async function sendAndConfirm(connection: Connection, signed: VersionedTransaction, lastValidBlockHeight: number): Promise<string> {
  const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" });

  for (;;) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const status = value[0];
    if (status?.err) throw new TransactionFailedError(JSON.stringify(status.err));
    if (status && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) return signature;
    if ((await connection.getBlockHeight("confirmed")) > lastValidBlockHeight) throw new BlockhashExpiredError();
    await sleep(POLL_MS);
  }
}
