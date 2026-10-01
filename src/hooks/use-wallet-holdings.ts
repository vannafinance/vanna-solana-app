import { useQuery } from "@tanstack/react-query";

import { totalValue, valueHoldings } from "@/lib/portfolio/value-holdings";
import { fetchOraclePrices } from "@/lib/solana/oracle-prices";
import { rpcConnection } from "@/lib/solana/rpc";
import { fetchHoldings } from "@/lib/solana/wallet-holdings";

import { queryKeys } from "./query-keys";

const STALE_MS = 12_000;

export function useWalletHoldings(wallet: string | null) {
  return useQuery({
    queryKey: queryKeys.walletHoldings(wallet ?? "none"),
    queryFn: async () => {
      const [holdings, prices] = await Promise.all([fetchHoldings(rpcConnection, wallet as string), fetchOraclePrices(rpcConnection)]);
      const valued = valueHoldings(holdings, prices);
      return { holdings: valued, total: totalValue(valued) };
    },
    enabled: wallet !== null,
    staleTime: STALE_MS,
    retry: 1,
  });
}
