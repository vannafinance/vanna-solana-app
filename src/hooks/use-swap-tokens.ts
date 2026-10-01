import { useCallback } from "react";

import { useOraclePrices } from "@/hooks/use-oracle-prices";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useWalletHoldings } from "@/hooks/use-wallet-holdings";
import { vaultMeta } from "@/lib/earn/vault-meta";
import { assets } from "@/lib/solana/assets";
import type { SwapToken } from "@/types/swap";
import type { Resource } from "@/types/resource";

// Every token is swappable at its oracle price; the balance is what the wallet holds right now.
export function useSwapTokens(): Resource<readonly SwapToken[]> {
  const wallet = useWalletAddress();
  const prices = useOraclePrices();
  const holdings = useWalletHoldings(wallet);
  const { refetch: refetchPrices } = prices;
  const { refetch: refetchHoldings } = holdings;
  const retry = useCallback(() => {
    void refetchPrices();
    void refetchHoldings();
  }, [refetchPrices, refetchHoldings]);

  const failed = [prices, holdings].find((query) => query.data === undefined && query.isError);
  if (failed) return { status: "error", error: failed.error as Error, retry };
  if (prices.data === undefined || holdings.data === undefined) return { status: "loading" };
  const priceMap = prices.data;
  const held = holdings.data.holdings;

  const tokens = assets.flatMap((asset): SwapToken[] => {
    const priceUsd = priceMap[asset.symbol];
    if (priceUsd === undefined) return [];
    return [
      {
        symbol: asset.symbol,
        name: vaultMeta[asset.symbol].name,
        decimals: asset.decimals,
        priceUsd,
        balance: held.find((holding) => holding.symbol === asset.symbol)?.raw ?? 0n,
      },
    ];
  });
  return tokens.length < 2 ? { status: "empty" } : { status: "ready", data: tokens, stale: prices.isError || holdings.isError, refresh: retry };
}
