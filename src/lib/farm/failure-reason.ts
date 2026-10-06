import { toTransactionError } from "@/lib/solana/transaction-errors";

type FailedMeta = { err: unknown; logMessages?: readonly string[] | null };

const GENERIC = "Something went wrong";

// Why a transaction that landed on the chain failed, in a few words ("Price moved"), read from its error and logs the same
// way the transaction sheet names a failure. Null when the chain's error says nothing more useful than "it failed".
export function failureReason(meta: FailedMeta): string | null {
  const { title } = toTransactionError(new Error(`${JSON.stringify(meta.err)} ${(meta.logMessages ?? []).join(" ")}`));
  return title === GENERIC ? null : title;
}
