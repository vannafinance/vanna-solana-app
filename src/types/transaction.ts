export type FailureKind = "network" | "rejected" | "no-fee" | "price-moved" | "expired" | "partial";

export type TransactionState =
  | { phase: "signing"; step: number; steps: number; wallet: string }
  | { phase: "confirming"; title: string; message: string }
  | { phase: "success"; title: string; message: string; explorerLabel?: string }
  | { phase: "failure"; kind: FailureKind; title: string; message: string };

export class TransactionError extends Error {
  constructor(
    readonly kind: FailureKind,
    readonly title: string,
    message: string,
  ) {
    super(message);
  }
}
