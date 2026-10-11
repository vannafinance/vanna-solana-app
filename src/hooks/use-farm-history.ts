import { useExplorer } from "@/hooks/use-explorer";
import { toUsd } from "@/lib/farm/units";
import type { FarmHistoryView } from "@/types/farm";
import type { Resource } from "@/types/resource";

import { useFarmState } from "./use-farm-state";

export function useFarmHistory() {
  const state = useFarmState();
  const { openTransaction } = useExplorer();

  const history: Resource<FarmHistoryView> = (() => {
    if (state.status !== "ready") return state;
    const { derived, positions, prices } = state.data;
    if (derived.entries.length === 0) return { status: "empty" };
    // What the closed positions kept beyond their debt, priced at today's oracle price of the pool asset.
    const earnedUsd = derived.yieldKept.reduce((sum, kept) => {
      const price = prices[kept.pool];
      const decimals = derived.entries.flatMap((entry) => entry.actions).find((action) => action.symbol === kept.pool)?.amount.decimals;
      return price === undefined || decimals === undefined ? sum : sum + toUsd({ raw: kept.raw, decimals }, price);
    }, 0n);
    return { ...state, data: { earnedUsd, closedCount: derived.closedCount, openCount: positions.length, entries: derived.entries } };
  })();

  return { history, openTransaction };
}
