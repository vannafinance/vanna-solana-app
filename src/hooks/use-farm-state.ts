import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { composePositions, unplacedPositions } from "@/lib/farm/compose-positions";
import { deriveFarm, type FarmDerived } from "@/lib/farm/derive-farm";
import { fetchKaminoPositions } from "@/lib/solana/farm-positions";
import { marginActivityFrom } from "@/lib/solana/margin-history";
import type { OraclePrices } from "@/lib/solana/oracle-prices";
import { marginAddress } from "@/lib/solana/program-accounts";
import { rpcConnection } from "@/lib/solana/rpc";
import type { WalletTransaction } from "@/lib/solana/wallet-transactions";
import { assets } from "@/lib/solana/assets";
import type { FarmPosition, PoolSymbol, UnplacedFarmPosition } from "@/types/farm";
import type { Resource } from "@/types/resource";

import { useKaminoStats } from "./use-kamino-stats";
import { useLiveInterval } from "./use-live-interval";
import { useOraclePrices } from "./use-oracle-prices";
import { queryKeys } from "./query-keys";
import { useWalletAddress } from "./use-wallet-address";
import { useWalletTransactionsOptions } from "./use-wallet-transactions";

const POOL_DECIMALS: Record<PoolSymbol, number> = {
  USDC: assets.find((asset) => asset.symbol === "USDC")?.decimals ?? 6,
  SOL: assets.find((asset) => asset.symbol === "SOL")?.decimals ?? 9,
};
const LIVE_MS = 15_000;
const STALE_MS = 10_000;

export type FarmState = {
  positions: readonly FarmPosition[];
  unplaced: readonly UnplacedFarmPosition[];
  derived: FarmDerived;
  prices: OraclePrices;
};

// A position is read from the chain; which stock backs it comes from the margin account's own transaction history.
export function useFarmState(): Resource<FarmState> {
  const wallet = useWalletAddress();
  const refetchInterval = useLiveInterval(LIVE_MS);
  const prices = useOraclePrices();
  const stats = useKaminoStats();
  const chain = useQuery({
    queryKey: queryKeys.kaminoPositions(wallet ?? "none"),
    queryFn: () => fetchKaminoPositions(rpcConnection, new PublicKey(wallet as string)),
    enabled: wallet !== null,
    staleTime: STALE_MS,
    refetchInterval,
    retry: 1,
  });
  // A stable selector, so the history is read through only when it changes and not on every render.
  const select = useCallback((data: WalletTransaction[]) => (wallet === null ? null : deriveFarm(marginActivityFrom(data, marginAddress(new PublicKey(wallet)).toBase58()))), [wallet]);
  const history = useQuery({ ...useWalletTransactionsOptions(wallet), select });

  const { refetch: refetchChain } = chain;
  const { refetch: refetchHistory } = history;
  const { refetch: refetchPrices } = prices;
  const retry = useCallback(() => {
    void refetchChain();
    void refetchHistory();
    void refetchPrices();
  }, [refetchChain, refetchHistory, refetchPrices]);

  if (wallet === null) return { status: "empty" };
  const failed = [chain, history, prices].find((query) => query.isError && query.data === undefined);
  if (failed?.error) return { status: "error", error: failed.error, retry };
  if (chain.data === undefined || history.data === undefined || history.data === null || prices.data === undefined) return { status: "loading" };

  const supply = { USDC: stats.data?.USDC?.supplyApyBps ?? null, SOL: stats.data?.SOL?.supplyApyBps ?? null };
  return {
    status: "ready",
    stale: chain.isError || history.isError,
    refresh: retry,
    data: {
      positions: composePositions(chain.data, history.data.attributions, prices.data, supply),
      unplaced: unplacedPositions(chain.data, history.data.attributions, POOL_DECIMALS),
      derived: history.data,
      prices: prices.data,
    },
  };
}
