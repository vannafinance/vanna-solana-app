import { EXCHANGE_RATE_DECIMALS, type PoolStats } from "@/lib/solana/pools-api";
import type { AssetSymbol } from "@/lib/solana/assets";
import type { OraclePrices } from "@/lib/solana/oracle-prices";
import type { ShareBalance } from "@/lib/solana/earn-deposits";

import { MissingPriceError } from "./value-holdings";

export type ValuedDeposit = {
  symbol: AssetSymbol;
  decimals: number;
  // Vault share tokens held.
  shares: bigint;
  supplied: bigint;
  value: bigint;
  supplyApyBps: number;
};

const RATE_SCALE = 10n ** BigInt(EXCHANGE_RATE_DECIMALS);

export function valueDeposits(shares: readonly ShareBalance[], pools: Partial<Record<AssetSymbol, PoolStats>>, prices: OraclePrices): ValuedDeposit[] {
  return shares
    .map(({ symbol, shares: amount, decimals }) => {
      const pool = pools[symbol];
      const price = prices[symbol];
      if (pool === undefined || price === undefined) throw new MissingPriceError(symbol);
      const supplied = (amount * pool.exchangeRate) / RATE_SCALE;
      return {
        symbol,
        decimals,
        shares: amount,
        supplied,
        value: (supplied * price) / 10n ** BigInt(decimals),
        supplyApyBps: Math.round(pool.supplyApyPercent * 100),
      };
    })
    .sort((a, b) => (a.value === b.value ? 0 : a.value > b.value ? -1 : 1));
}

export function averageApyBps(deposits: readonly ValuedDeposit[]): number | null {
  const total = deposits.reduce((sum, deposit) => sum + deposit.value, 0n);
  if (total === 0n) return null;
  const weighted = deposits.reduce((sum, deposit) => sum + deposit.value * BigInt(deposit.supplyApyBps), 0n);
  return Number((weighted * 100n) / total) / 100;
}
