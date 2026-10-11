import { parseUnits } from "@/format/format-amount";
import { vaultMeta } from "@/lib/earn/vault-meta";
import { type AssetSymbol, assets } from "@/lib/solana/assets";
import type { OraclePrices } from "@/lib/solana/oracle-prices";
import type { PoolStats } from "@/lib/solana/pools-api";
import type { PerpsMarket, PerpsSymbol } from "@/types/perps";

import { pairOf } from "./summarize-portfolio";

// Product limit: the margin program caps leverage at 5x for every market.
export const MAX_LEVERAGE = 5;

// The market the order ticket opens on when a flow does not name one.
export const DEFAULT_MARKET: PerpsSymbol = "TSLAx";

const STOCKS: readonly PerpsSymbol[] = ["TSLAx", "GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI", "SKR"];
// A dollar, in USD units, for the USDC pool when its oracle price is missing.
const USDC_PRICE = 1_000_000n;
const decimalsOf = new Map(assets.map((asset) => [asset.symbol, asset.decimals]));

const toUsd = (tokens: number, symbol: AssetSymbol, price: bigint): bigint => {
  const decimals = decimalsOf.get(symbol) ?? 0;
  const raw = parseUnits(Math.max(tokens, 0).toFixed(decimals), decimals);
  return raw === null ? 0n : (raw * price) / 10n ** BigInt(decimals);
};

function marketKind(symbol: PerpsSymbol): PerpsMarket["kind"] {
  const category = vaultMeta[symbol].category;
  return category === "PreStocks" || category === "Crypto" ? category : "xStocks";
}

// A market needs its own pool and price, and the USDC pool for the quote-side borrow rate; without all three it is not listed.
export function buildMarkets(pools: Partial<Record<AssetSymbol, PoolStats>>, prices: OraclePrices): PerpsMarket[] {
  const usdc = pools.USDC;
  if (usdc === undefined) return [];
  return STOCKS.flatMap((symbol): PerpsMarket[] => {
    const pool = pools[symbol];
    const price = prices[symbol];
    if (pool === undefined || price === undefined) return [];
    return [
      {
        symbol,
        pair: pairOf(symbol),
        name: vaultMeta[symbol].name,
        kind: marketKind(symbol),
        markPrice: price,
        tokenBorrowBps: Math.round(pool.borrowApyPercent * 100),
        usdcBorrowBps: Math.round(usdc.borrowApyPercent * 100),
        liquidityUsd: toUsd(pool.totalSupply - pool.totalBorrowed, symbol, price),
        usdcLiquidityUsd: toUsd(usdc.totalSupply - usdc.totalBorrowed, "USDC", prices.USDC ?? USDC_PRICE),
        maxLeverage: MAX_LEVERAGE,
      },
    ];
  });
}
