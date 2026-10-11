import { useMobileWallet } from "@wallet-ui/react-native-web3js";
import { useCallback, useEffect, useState } from "react";

import type { Resource } from "@/types/resource";

export function useWalletSession() {
  const { store } = useMobileWallet();
  const [resource, setResource] = useState<Resource<boolean>>({ status: "loading" });
  const restore = useCallback(async () => {
    setResource({ status: "loading" });
    try {
      await store.fetch();
      setResource({ status: "ready", data: true });
    } catch {
      setResource({
        status: "error",
        error: new Error("Could not restore your wallet session."),
        retry: () => void restore(),
      });
    }
  }, [store]);

  useEffect(() => { void restore(); }, [restore]);
  return resource;
}
