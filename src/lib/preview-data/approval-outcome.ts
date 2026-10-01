import { type RunProgress, TransactionError } from "@/types/transaction";

export type ApprovalOutcome = "success" | "network" | "rejected" | "no-fee" | "price-moved" | "expired";

const listeners = new Set<() => void>();
let current: ApprovalOutcome = "success";

export function getApprovalOutcome() {
  return current;
}

export function setApprovalOutcome(next: ApprovalOutcome) {
  current = next;
  listeners.forEach((listener) => listener());
}

export function subscribeApprovalOutcome(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const failures: Record<Exclude<ApprovalOutcome, "success">, TransactionError> = {
  network: new TransactionError("network", "Network error", "Solana did not confirm this in time. Nothing left your wallet. Check your connection and try again."),
  rejected: new TransactionError("rejected", "Request cancelled", "You cancelled the request in your wallet. Nothing was sent."),
  "no-fee": new TransactionError("no-fee", "Not enough SOL for fees", "Your wallet needs a little SOL to pay network fees. Add some SOL and try again."),
  "price-moved": new TransactionError("price-moved", "Price moved", "The price moved past your slippage limit before this confirmed. Nothing was sent. Try again."),
  expired: new TransactionError("expired", "Request expired", "The approval request timed out in your wallet. Nothing was sent. Try again."),
};

// Stand-in for building, signing and confirming a transaction; replaced by the real pipeline in src/lib/solana.
export async function previewApproval(_step?: number, progress?: RunProgress): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  if (current === "rejected" || current === "expired" || current === "no-fee") throw failures[current];
  progress?.signed();
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (current !== "success") throw failures[current];
}
