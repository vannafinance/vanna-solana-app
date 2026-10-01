import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { enterTradeTab, type TradeTab } from "@/lib/perps/trade-tab-focus";

export function usePerpsTabFocus(tab: TradeTab) {
  useFocusEffect(
    useCallback(() => {
      enterTradeTab(tab);
    }, [tab]),
  );
}
