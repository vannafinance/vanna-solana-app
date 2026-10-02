import type { TokenAmount } from "@/format/format-amount";

export type HistoryStrategy = "perps" | "farm" | "unclassified";

export type HistoryLeg = { asset: string; amount: TokenAmount };

export type HistoryChip = { type: "deposit" | "borrow" | "repay" | "withdraw"; leg: HistoryLeg } | { type: "swap"; from: HistoryLeg; to: HistoryLeg };

// One transaction of the margin account: a position action is atomic, so open or close reads as one entry, not three.
export type MarginActivity = {
  signature: string;
  at: number;
  strategy: HistoryStrategy;
  title: string | null;
  // The stock the transaction is about, for its icon.
  stock: string | null;
  chips: HistoryChip[];
};
