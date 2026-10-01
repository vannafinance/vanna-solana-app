import { useQuery } from "@tanstack/react-query";

import { earnEventsFrom } from "@/lib/solana/earn-history";

import { walletTransactionsOptions } from "./use-wallet-transactions";

export function useEarnEvents(wallet: string | null) {
  return useQuery({ ...walletTransactionsOptions(wallet), select: earnEventsFrom });
}
