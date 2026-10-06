import type { VersionedTransaction } from "@solana/web3.js";

import { WRONG_SIGNER } from "./transaction-errors";

// A wallet on another account than the one connected cannot sign for it: the connected address's signature slot comes back
// empty. Sending that would only fail with a vague signature error, so it is stopped here and explained.
export function assertSignedBy(transactions: readonly VersionedTransaction[], owner: string): void {
  for (const transaction of transactions) {
    const index = transaction.message.staticAccountKeys.findIndex((key) => key.toBase58() === owner);
    const signature = index >= 0 ? transaction.signatures[index] : undefined;
    if (signature === undefined || signature.every((byte) => byte === 0)) throw new Error(WRONG_SIGNER);
  }
}
