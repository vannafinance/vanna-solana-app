import type { TransactionState } from "./transaction";

// Everything the one-time margin account setup shows and does, so the same screen content can sit inside the Trade tabs
// and on its own route.
export type MarginSetupView = {
  created: boolean;
  marginAddress: string;
  agreementOpen: boolean;
  agreed: boolean;
  openSection: number | null;
  state: TransactionState | null;
  done: boolean;
  openAgreement: () => void;
  closeAgreement: () => void;
  toggleAgreed: () => void;
  toggleSection: (index: number) => void;
  sign: () => void;
  onPrimary: () => void;
  closeFlow: () => void;
  openExplorer?: () => void;
  openPosition: () => void;
};
