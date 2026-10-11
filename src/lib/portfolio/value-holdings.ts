import type { OraclePrices } from "@/lib/solana/oracle-prices";
import type { Holding } from "@/lib/solana/wallet-holdings";
import type { AssetSymbol } from "@/lib/solana/assets";

export type ValuedHolding = Holding & { unitPrice: bigint; value: bigint };

export class MissingPriceError extends Error {
  constructor(readonly symbol: AssetSymbol) {
    super("Prices for some of your tokens aren't available yet. Try again shortly.");
    this.name = "MissingPriceError";
  }
}

// Wallet value is only meaningful if every held token is priced; a partial sum would understate it.
export function valueHoldings(holdings: readonly Holding[], prices: OraclePrices): ValuedHolding[] {
  return holdings
    .map((holding) => {
      const unitPrice = prices[holding.symbol];
      if (unitPrice === undefined) throw new MissingPriceError(holding.symbol);
      return { ...holding, unitPrice, value: (holding.raw * unitPrice) / 10n ** BigInt(holding.decimals) };
    })
    .sort((a, b) => (a.value === b.value ? 0 : a.value > b.value ? -1 : 1));
}

export function totalValue(holdings: readonly ValuedHolding[]): bigint {
  return holdings.reduce((sum, holding) => sum + holding.value, 0n);
}
