import { router } from "expo-router";

import { routes } from "@/navigation/routes";

import { useMarginAccount } from "./use-margin-account";
import { useWalletAddress } from "./use-wallet-address";
import { useWalletHoldings } from "./use-wallet-holdings";

// What Markets shows a wallet that has no margin account yet: the prompt to open one, and the wallet balance that
// would become its collateral.
export function useMarginPrompt() {
  const wallet = useWalletAddress();
  const { exists, known } = useMarginAccount();
  const holdings = useWalletHoldings(wallet);

  return {
    visible: known && !exists,
    walletBalance: holdings.data?.total ?? null,
    open: () => router.push(routes.marginCreate),
  };
}
