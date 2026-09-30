import type { SwapQuote, SwapToken } from "@/types/swap";

const BPS = 10_000n;

// Stand-in for a Jupiter quote: mid price from the token prices, impact from pool depth.
// Real quotes come from the server route /api/jupiter/quote.
export function quoteExactIn(amountIn: bigint, from: SwapToken, to: SwapToken, slippageBps: number): SwapQuote {
  const fromScale = 10n ** BigInt(from.decimals);
  const toScale = 10n ** BigInt(to.decimals);
  const payValueUsd = (amountIn * from.priceUsd) / fromScale;
  const amountOut = (amountIn * from.priceUsd * toScale) / (to.priceUsd * fromScale);
  const depth = from.depthUsd < to.depthUsd ? from.depthUsd : to.depthUsd;
  const priceImpactBps = Number((payValueUsd * BPS) / depth);

  return {
    amountOut,
    minReceived: (amountOut * (BPS - BigInt(slippageBps))) / BPS,
    priceImpactBps,
    payValueUsd,
    receiveValueUsd: (payValueUsd * (BPS - BigInt(priceImpactBps))) / BPS,
    slippageBps,
  };
}
