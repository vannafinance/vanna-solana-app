import type { TransactionState } from "./transaction";

export type EnvelopeStage = "sealed" | "waiting" | "open";

// What the margin account sheet shows and does: the introduction until the user opens the account, then one wallet
// approval with the envelope as its picture.
export type MarginAccountView = {
  address: string;
  intro: boolean;
  stage: EnvelopeStage;
  state: TransactionState | null;
  open: () => void;
  dismiss: () => void;
  onPrimary: () => void;
  closeFlow: () => void;
  openExplorer?: () => void;
};
