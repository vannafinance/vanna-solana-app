import * as WebBrowser from "expo-web-browser";

import { explorerTransactionUrl } from "@/lib/solana/explorer";

function openTransaction(signature: string) {
  void WebBrowser.openBrowserAsync(explorerTransactionUrl(signature));
}

export function useExplorer() {
  return { openTransaction };
}
