import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { useExplorer } from "@/hooks/use-explorer";
import { enterTradeTab, tradeTabBefore } from "@/lib/perps/trade-tab-focus";

export type HistoryView = "perps" | "swaps";

export function usePerpsHistoryView() {
  const [view, setView] = useState<HistoryView>("perps");
  const { openTransaction } = useExplorer();

  useFocusEffect(
    useCallback(() => {
      enterTradeTab("history");
      setView(tradeTabBefore() === "swap" ? "swaps" : "perps");
    }, []),
  );

  return {
    view,
    setView,
    openTransaction,
  };
}
