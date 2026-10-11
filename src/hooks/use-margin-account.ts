import { useQueryClient } from "@tanstack/react-query";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useWalletAddress } from "@/hooks/use-wallet-address";

import { queryKeys } from "./query-keys";

// Whether the wallet has a margin account on the fork. Until the first read finishes `known` is false, so a flow
// can wait instead of sending a user with an account to the create screen.
export function useMarginAccount() {
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const queryClient = useQueryClient();

  return {
    exists: account.data?.hasMarginAccount ?? false,
    address: account.data?.address ?? null,
    known: account.data !== undefined,
    markCreated: () => {
      if (wallet !== null) void queryClient.invalidateQueries({ queryKey: queryKeys.accountSnapshot(wallet) });
    },
  };
}
