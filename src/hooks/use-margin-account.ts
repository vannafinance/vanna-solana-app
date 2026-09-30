import { useSyncExternalStore } from "react";

import { getMarginAccountExists, setMarginAccountExists, subscribeMarginAccount } from "@/lib/preview-data/margin-account";

export function useMarginAccount() {
  const exists = useSyncExternalStore(subscribeMarginAccount, getMarginAccountExists);
  return { exists, markCreated: () => setMarginAccountExists(true), reset: () => setMarginAccountExists(false) };
}
