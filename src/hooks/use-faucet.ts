import { useMutation } from "@tanstack/react-query";

import { FORK_FAUCET_ENABLED } from "@/lib/solana/config";
import { FAUCET_SYMBOLS, requestFaucetGrant, type FaucetGrant, type FaucetSymbol } from "@/lib/solana/fork-faucet";

import { useWalletSigner } from "./use-wallet-signer";

export type FaucetState =
  | { status: "idle" }
  | { status: "pending"; symbol: FaucetSymbol }
  | { status: "granted"; grant: FaucetGrant }
  | { status: "error"; message: string };

export function useFaucet() {
  const { owner, refreshAfterTransaction } = useWalletSigner();
  const mutation = useMutation({
    mutationFn: (symbol: FaucetSymbol) => {
      if (owner === null) throw new Error("Connect a wallet first.");
      return requestFaucetGrant(symbol, owner);
    },
    onSuccess: refreshAfterTransaction,
  });

  const state: FaucetState = mutation.isPending
    ? { status: "pending", symbol: mutation.variables }
    : mutation.isError
      ? { status: "error", message: mutation.error.message }
      : mutation.isSuccess
        ? { status: "granted", grant: mutation.data }
        : { status: "idle" };

  return {
    available: FORK_FAUCET_ENABLED && owner !== null,
    symbols: FAUCET_SYMBOLS,
    state,
    request: (symbol: FaucetSymbol) => mutation.mutate(symbol),
  };
}
