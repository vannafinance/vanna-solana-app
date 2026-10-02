export type ReviewTone = "default" | "positive" | "negative";

export type ReviewRow = { label: string; value: string; tone?: ReviewTone };

// One side of what is about to happen: what leaves the wallet or what arrives, with its value in dollars.
export type ReviewLeg = { label: string; value: string; caption: string };

// Everything a user should see before the wallet is asked to sign, so the wallet request is never the first they hear of it.
export type ReviewData = {
  title: string;
  legs: readonly ReviewLeg[];
  rows: readonly ReviewRow[];
  wallet: { name: string; address: string };
  network: string;
  confirmLabel: string;
};
