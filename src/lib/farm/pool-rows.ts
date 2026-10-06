import type { FarmPool, FarmPoolRow, FarmPositionView } from "@/types/farm";

import { MAX_LEVERAGE, netApyAtLeverageBps } from "./farm-math";
import { toUsd } from "./units";

// The pools a stock can be farmed into, with what the user already holds in each.
export function farmPoolRows(pools: readonly FarmPool[], positions: readonly FarmPositionView[]): FarmPoolRow[] {
  return pools.map((pool) => {
    const held = positions.filter((position) => position.poolSymbol === pool.symbol);
    return {
      pool,
      totalSuppliedUsd: toUsd({ raw: pool.totalSupplied, decimals: pool.decimals }, pool.priceUsd),
      maxLeverage: MAX_LEVERAGE,
      maxNetApyBps: netApyAtLeverageBps(pool.supplyApyBps, pool.borrowApyBps, MAX_LEVERAGE),
      yoursUsd: held.length === 0 ? null : held.reduce((sum, position) => sum + position.netValueUsd, 0n),
    };
  });
}
