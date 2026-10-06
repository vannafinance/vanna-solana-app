import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";

import { NETWORK_LABEL } from "@/lib/solana/config";

const DOCS_URL = "https://docs.solana.vanna.finance/home";
const SUPPORT_URL = "https://vanna.finance";

export function useAppInfo() {
  return {
    version: Constants.expoConfig?.version ?? "1.0.0",
    network: NETWORK_LABEL,
    openDocs: () => void WebBrowser.openBrowserAsync(DOCS_URL),
    openSupport: () => void WebBrowser.openBrowserAsync(SUPPORT_URL),
  };
}
