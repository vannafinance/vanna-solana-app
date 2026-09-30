import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";

const DOCS_URL = "https://docs.vanna.finance";
const SUPPORT_URL = "https://vanna.finance";
const NETWORK_LABEL = "Solana Devnet";

export function useAppInfo() {
  return {
    version: Constants.expoConfig?.version ?? "1.0.0",
    network: NETWORK_LABEL,
    openDocs: () => void WebBrowser.openBrowserAsync(DOCS_URL),
    openSupport: () => void WebBrowser.openBrowserAsync(SUPPORT_URL),
  };
}
