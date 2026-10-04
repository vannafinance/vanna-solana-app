import { TransactionError } from "@/types/transaction";

import { VANNA_PROGRAM_ID } from "./config";
import { PriceImpactError } from "./perps-errors";
import { ApiError } from "./request-json";
import { PartialSendError } from "./send-batches";
import { BlockhashExpiredError, ConfirmationLostError, isNetworkFailure, TransactionFailedError } from "./send-transaction";

export const WALLET_MISMATCH = "wallet-mismatch";

const REJECTED = /cancel|declin|reject|denied|ERROR_NOT_SIGNED|ERROR_ASSOCIATION_CANCELLED|CancellationException/i;
// A wallet that has never held SOL has no account at all, which the cluster reports as AccountNotFound for the fee payer.
const NO_FEE = /AccountNotFound|InsufficientFundsFor(Fee|Rent)|insufficient (lamports|funds for fee)|attempt to debit an account but found no record|0x1\b.*lamports|insufficient funds for rent/i;
const PRICE_MOVED = /0x1771|6001|SlippageToleranceExceeded|0xbbd|3005|AccountNotEnoughKeys|bin_array/i;
const BLOCKHASH_STALE = /blockhash not found/i;
const TOO_LARGE = /too large to send in one transaction|encoding overruns/i;
const CONNECTION_REFUSED = /authorization request failed/i;
const WALLET_UNREACHABLE = /ConnectionFailedException|unable to connect to websocket|ERROR_SESSION_TIMEOUT|ERROR_WALLET_NOT_FOUND/i;
const NOT_ENOUGH_TOKENS = /insufficient funds|custom program error: 0x1\b/i;

// Vanna program errors a lender or margin user can hit; codes are the program's custom error numbers.
const PROGRAM_ERRORS: Record<number, { title: string; message: string }> = {
  6004: { title: "Action paused", message: "Vanna has paused this action for now. Nothing was sent." },
  6015: { title: "Vault is full", message: "This vault has reached its supply cap. Nothing was sent. Try a smaller amount." },
  6018: { title: "Not enough free liquidity", message: "Vanna does not have that much free to lend or pay out right now. Nothing was sent. Try a smaller amount, or try again later." },
  6020: { title: "Not enough supplied", message: "You have less supplied in this vault than the amount requested. Nothing was sent." },
  6045: { title: "Amount too small", message: "The vault needs a larger first deposit. Nothing was sent." },
};

function programError(text: string): { title: string; message: string } | null {
  const hex = /custom program error: 0x([0-9a-f]+)/i.exec(text);
  const json = /"Custom":(\d+)/.exec(text);
  const code = hex ? Number.parseInt(hex[1], 16) : json ? Number(json[1]) : null;
  return code === null ? null : (PROGRAM_ERRORS[code] ?? null);
}

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

const DETAIL_LIMIT = 240;

function detailOf(error: unknown): string {
  const text = textOf(error).replace(/\s+/g, " ").trim();
  return text.length > DETAIL_LIMIT ? `${text.slice(0, DETAIL_LIMIT)}…` : text;
}

// The wallet declined to authorize this app before anything was shown to the user. Wallets check the app's identity under a
// tight time limit, so this one is often a slow answer and goes away on a second try.
export function isWalletRefusal(error: unknown): boolean {
  return CONNECTION_REFUSED.test(textOf(error));
}

export function toTransactionError(error: unknown): TransactionError {
  if (error instanceof TransactionError) return error;
  if (error instanceof PartialSendError) {
    const cause = toTransactionError(error.reason);
    return new TransactionError("partial", "Only the first step went through", `${cause.title}. ${cause.message} What already went through stays in your margin account. Try again to finish.`, cause.detail);
  }
  if (error instanceof BlockhashExpiredError) {
    return new TransactionError("expired", "Request expired", "The transaction was not confirmed in time. Nothing was sent. Try again.");
  }
  if (error instanceof ConfirmationLostError) {
    return new TransactionError("network", "Could not confirm", "Your connection dropped after this was sent, so we can't tell if it went through. Check your Portfolio before trying again.");
  }
  if (BLOCKHASH_STALE.test(textOf(error))) {
    return new TransactionError("expired", "Request expired", "It took too long to approve, so the network no longer accepts it. Nothing was sent. Try again.");
  }
  if (isNetworkFailure(error)) {
    return new TransactionError("network", "Can't reach Solana", "Your connection dropped before this was sent. Nothing left your wallet. Check your connection and try again.");
  }
  if (error instanceof PriceImpactError) {
    return new TransactionError("network", "Price impact too high", `${error.message} Nothing was sent.`);
  }
  const text = textOf(error);
  if (text.includes(WALLET_MISMATCH)) {
    return new TransactionError("network", "Wrong wallet", "This build is showing another wallet's data. Disconnect the developer wallet override to send transactions.");
  }
  if (TOO_LARGE.test(text)) {
    return new TransactionError("network", "Order too large", "This account holds so many positions that the order does not fit in a Solana transaction, even with a lookup table. Close or reduce a position first, then try again. Nothing was sent.");
  }
  if (WALLET_UNREACHABLE.test(text)) {
    return new TransactionError("network", "Could not reach your wallet", "The wallet app did not answer in time. Open it once, then try again. Nothing was sent.");
  }
  if (CONNECTION_REFUSED.test(text)) {
    return new TransactionError("network", "Your wallet refused this", "The wallet could not verify Vanna just now, or Android opened a different wallet than the one you connected with. Try again, or disconnect in Profile and connect again. Nothing was sent.");
  }
  if (REJECTED.test(text)) return new TransactionError("rejected", "Request cancelled", "You cancelled the request in your wallet. Nothing was sent.");
  const program = text.includes(VANNA_PROGRAM_ID) ? programError(text) : null;
  if (program) return new TransactionError("network", program.title, program.message);
  if (PRICE_MOVED.test(text)) return new TransactionError("price-moved", "Price moved", "The price moved past your slippage limit before this confirmed. Nothing was sent. Try again.");
  if (NO_FEE.test(text)) return new TransactionError("no-fee", "Not enough SOL", "Your wallet needs a little SOL for network fees and account rent. Nothing was sent. Add some SOL and try again.");
  if (NOT_ENOUGH_TOKENS.test(text)) return new TransactionError("network", "Not enough balance", "Your wallet does not hold enough of this token. Nothing was sent.");
  if (error instanceof ApiError) {
    return new TransactionError("network", "Network error", "Vanna could not be reached. Nothing left your wallet. Check your connection and try again.");
  }
  if (/lookup table was not ready/i.test(text)) {
    return new TransactionError("network", "The network was slow", "Setting up this transaction took too long. Only a small temporary account was created. Try again.");
  }
  if (error instanceof TransactionFailedError) {
    return new TransactionError("network", "Transaction failed", "Solana rejected this transaction before it was sent. Nothing left your wallet. Try again in a moment.", detailOf(error));
  }
  return new TransactionError("network", "Something went wrong", "The transaction did not go through. Nothing left your wallet.", detailOf(error));
}
