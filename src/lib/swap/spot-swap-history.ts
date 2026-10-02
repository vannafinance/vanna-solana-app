import type { OraclePrices } from "@/lib/solana/oracle-prices";
import type { SpotSwap } from "@/lib/solana/spot-swaps";
import type { SwapHistoryEntry } from "@/types/swap";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// History has no price at the time of each swap, so a swap is valued at today's oracle price of the token
// that was sold, falling back to the one received. A swap with neither priced is valued at zero.
export function toHistoryEntries(swaps: readonly SpotSwap[], prices: OraclePrices): SwapHistoryEntry[] {
  return swaps.map((swap) => {
    const soldPrice = prices[swap.from];
    const boughtPrice = prices[swap.to];
    const valueUsd =
      soldPrice !== undefined
        ? (swap.amountIn * soldPrice) / 10n ** BigInt(swap.decimalsIn)
        : boughtPrice !== undefined
          ? (swap.amountOut * boughtPrice) / 10n ** BigInt(swap.decimalsOut)
          : 0n;
    return {
      id: swap.signature,
      signature: swap.signature,
      timestamp: swap.timestamp,
      from: swap.from,
      to: swap.to,
      amountIn: { raw: swap.amountIn, decimals: swap.decimalsIn },
      amountOut: { raw: swap.amountOut, decimals: swap.decimalsOut },
      valueUsd,
    };
  });
}

export function volumeSince(entries: readonly SwapHistoryEntry[], now: number): bigint {
  return entries.filter((entry) => now - entry.timestamp <= THIRTY_DAYS_MS).reduce((sum, entry) => sum + entry.valueUsd, 0n);
}
