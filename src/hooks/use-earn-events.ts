import { useQuery } from "@tanstack/react-query";

import { earnEventsFrom } from "@/lib/solana/earn-history";

import { useWalletTransactionsOptions } from "./use-wallet-transactions";

export function useEarnEvents(wallet: string | null) {
  return useQuery({ ...useWalletTransactionsOptions(wallet), select: earnEventsFrom });
}
