import { useSyncExternalStore } from "react";

import { onlineFlag, previewAccount } from "@/lib/preview-data/home";

// Preview: reads a flag. The real implementation reads expo-network once that package is added.
export function useConnectivity() {
  const online = useSyncExternalStore(onlineFlag.subscribe, onlineFlag.get);

  return {
    online,
    staleMinutes: previewAccount.lastSyncedMinutesAgo,
    retry: () => onlineFlag.set(true),
    simulateOffline: (offline: boolean) => onlineFlag.set(!offline),
  };
}
