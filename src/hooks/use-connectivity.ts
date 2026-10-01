import { useSyncExternalStore } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { simulatedOffline } from "@/lib/dev/simulated-offline";

const MINUTE = 60_000;

// Offline means the latest refresh of the account failed. The age of the data on screen is the time between the
// last good read and that failure.
export function useConnectivity() {
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const simulated = useSyncExternalStore(simulatedOffline.subscribe, simulatedOffline.get);
  const { refetch } = account;

  return {
    online: !simulated && !account.isError,
    staleMinutes: Math.max(Math.floor((account.errorUpdatedAt - account.dataUpdatedAt) / MINUTE), 0),
    retry: () => {
      simulatedOffline.set(false);
      void refetch();
    },
    simulateOffline: simulatedOffline.set,
  };
}
