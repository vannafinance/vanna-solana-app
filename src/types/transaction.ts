export type FailureKind = "network" | "rejected" | "no-fee" | "price-moved" | "expired" | "partial";

// Where a signed transaction is on its way: being broadcast, accepted by the network, or processed by a validator.
export type ConfirmStage = "sending" | "sent" | "processed";

export type TransactionState =
  | { phase: "signing"; step: number; steps: number; wallet: string }
  | { phase: "confirming"; stage: ConfirmStage; title: string; message: string; signature?: string }
  | { phase: "success"; title: string; message: string; explorerLabel?: string; signature?: string }
  | { phase: "failure"; kind: FailureKind; title: string; message: string; actionLabel?: string };

export type RunProgress = {
  signed: () => void;
  sent: (signature?: string) => void;
  processed: () => void;
};

export class TransactionError extends Error {
  constructor(
    readonly kind: FailureKind,
    readonly title: string,
    message: string,
  ) {
    super(message);
  }
}
