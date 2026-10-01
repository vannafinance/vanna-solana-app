import { useQuery } from "@tanstack/react-query";

import { assets } from "@/lib/solana/assets";
import { fetchJupiterQuote, NoRouteError } from "@/lib/solana/jupiter-quote";
import type { SwapQuote, SwapToken } from "@/types/swap";

import { useDebouncedValue } from "./use-debounced-value";
import { useLiveInterval } from "./use-live-interval";

const DEBOUNCE_MS = 350;
const REFRESH_MS = 15_000;
const mintOf = new Map(assets.map((asset) => [asset.symbol, asset.mint]));

type QuoteState = { quote: SwapQuote | null; loading: boolean; noRoute: boolean; failed: boolean };

// A quote follows the typed amount after a short pause and refreshes while the screen is focused.
export function useSwapQuote(from: SwapToken, to: SwapToken, amountIn: bigint | null, slippageBps: number): QuoteState {
  const amount = useDebouncedValue(amountIn, DEBOUNCE_MS);
  const refetchInterval = useLiveInterval(REFRESH_MS);
  const active = amount !== null && amount > 0n && from.symbol !== to.symbol;

  const query = useQuery({
    queryKey: ["swap-quote", from.symbol, to.symbol, amount?.toString() ?? "0", slippageBps],
    queryFn: ({ signal }) => fetchJupiterQuote(mintOf.get(from.symbol) as string, mintOf.get(to.symbol) as string, amount as bigint, slippageBps, signal),
    enabled: active,
    staleTime: 8_000,
    refetchInterval,
    retry: (count, error) => !(error instanceof NoRouteError) && count < 1,
  });

  if (!active || amountIn === null || amountIn === 0n) return { quote: null, loading: false, noRoute: false, failed: false };
  if (query.data === undefined) {
    return { quote: null, loading: !query.isError, noRoute: query.error instanceof NoRouteError, failed: query.isError && !(query.error instanceof NoRouteError) };
  }

  const payValueUsd = (amountIn * from.priceUsd) / 10n ** BigInt(from.decimals);
  const receiveValueUsd = (query.data.amountOut * to.priceUsd) / 10n ** BigInt(to.decimals);
  return {
    quote: { ...query.data, payValueUsd, receiveValueUsd, slippageBps },
    loading: amount !== amountIn,
    noRoute: false,
    failed: false,
  };
}
