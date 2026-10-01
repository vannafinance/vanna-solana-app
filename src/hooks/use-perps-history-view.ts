import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";

import { enterTradeTab, tradeTabBefore } from "@/lib/perps/trade-tab-focus";
import { previewAccount } from "@/lib/preview-data/home";

export type HistoryView = "perps" | "swaps";

export function usePerpsHistoryView() {
  const [view, setView] = useState<HistoryView>("perps");

  useFocusEffect(
    useCallback(() => {
      enterTradeTab("history");
      setView(tradeTabBefore() === "swap" ? "swaps" : "perps");
    }, []),
  );

  return {
    view,
    setView,
    openExplorer: () => void WebBrowser.openBrowserAsync(`https://solscan.io/account/${previewAccount.marginAddress}`),
  };
}
