import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";

import { enterTradeTab, tradeTabBefore } from "@/lib/perps/trade-tab-focus";
import { useMarginAccount } from "@/hooks/use-margin-account";

export type HistoryView = "perps" | "swaps";

export function usePerpsHistoryView() {
  const [view, setView] = useState<HistoryView>("perps");
  const { address } = useMarginAccount();

  useFocusEffect(
    useCallback(() => {
      enterTradeTab("history");
      setView(tradeTabBefore() === "swap" ? "swaps" : "perps");
    }, []),
  );

  return {
    view,
    setView,
    openExplorer: () => {
      if (address !== null) void WebBrowser.openBrowserAsync(`https://solscan.io/account/${address}`);
    },
  };
}
