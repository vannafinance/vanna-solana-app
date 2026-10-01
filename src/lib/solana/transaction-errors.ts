import { TransactionError } from "@/types/transaction";

import { ApiError } from "./request-json";
import { BlockhashExpiredError, TransactionFailedError } from "./send-transaction";

export const WALLET_MISMATCH = "wallet-mismatch";

const REJECTED = /cancel|declin|reject|denied|ERROR_NOT_SIGNED|ERROR_ASSOCIATION_CANCELLED|CancellationException/i;
const NO_FEE = /insufficient (lamports|funds for fee)|attempt to debit an account but found no record|0x1\b.*lamports|insufficient funds for rent/i;
const PRICE_MOVED = /0x1771|6001|SlippageToleranceExceeded|0xbbd|3005|AccountNotEnoughKeys|bin_array/i;
const NOT_ENOUGH_TOKENS = /insufficient funds|custom program error: 0x1\b/i;

function textOf(error: unknown): string {
  if (error instanceof Error) {
    const code = "code" in error ? ` ${String(error.code)}` : "";
    return `${error.name} ${error.message}${code}`;
  }
  return String(error);
}

// A swap pool the fork cloned earlier can drift from the quote; a fresh quote usually fixes it.
export function isStalePoolError(error: unknown): boolean {
  return PRICE_MOVED.test(textOf(error));
}

export function toTransactionError(error: unknown): TransactionError {
  if (error instanceof TransactionError) return error;
  if (error instanceof BlockhashExpiredError) {
    return new TransactionError("expired", "Request expired", "The transaction was not confirmed in time. Nothing was sent. Try again.");
  }
  const text = textOf(error);
  if (text.includes(WALLET_MISMATCH)) {
    return new TransactionError("network", "Wrong wallet", "This build is showing another wallet's data. Disconnect the developer wallet override to send transactions.");
  }
  if (REJECTED.test(text)) return new TransactionError("rejected", "Request cancelled", "You cancelled the request in your wallet. Nothing was sent.");
  if (PRICE_MOVED.test(text)) return new TransactionError("price-moved", "Price moved", "The price moved past your slippage limit before this confirmed. Nothing was sent. Try again.");
  if (NO_FEE.test(text)) return new TransactionError("no-fee", "Not enough SOL for fees", "Your wallet needs a little SOL to pay network fees. Add some SOL and try again.");
  if (NOT_ENOUGH_TOKENS.test(text)) return new TransactionError("network", "Not enough balance", "Your wallet does not hold enough of this token. Nothing was sent.");
  if (error instanceof ApiError || error instanceof TransactionFailedError) {
    return new TransactionError("network", "Network error", "Solana did not confirm this. Nothing left your wallet. Check your connection and try again.");
  }
  return new TransactionError("network", "Something went wrong", "The transaction did not go through. Nothing left your wallet.");
}
