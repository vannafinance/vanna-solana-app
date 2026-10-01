import { useMobileWallet } from "@wallet-ui/react-native-web3js";
import { useQueryClient } from "@tanstack/react-query";
import type { VersionedTransaction } from "@solana/web3.js";
import { useCallback } from "react";

import { DEV_WALLET_ADDRESS } from "@/lib/solana/config";

// The wallet signs only. In development builds a developer wallet override can show another address's data, in
// which case that address cannot be the signer and transactions are refused instead of sent from the wrong account.
export function useWalletSigner() {
  const { account, signTransaction } = useMobileWallet();
  const queryClient = useQueryClient();
  const owner = account?.address.toBase58() ?? null;
  const mismatch = DEV_WALLET_ADDRESS !== undefined && owner !== DEV_WALLET_ADDRESS;

  const sign = useCallback((transaction: VersionedTransaction) => signTransaction(transaction), [signTransaction]);

  // After a confirmed transaction every live figure is stale; refetch them now instead of waiting for the next poll.
  const refreshAfterTransaction = useCallback(() => {
    for (const key of ["account-snapshot", "wallet-holdings", "earn-deposits", "wallet-transactions", "pools"]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);

  return { owner, mismatch, sign, refreshAfterTransaction };
}
