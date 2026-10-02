import { PublicKey } from "@solana/web3.js";

import { type AssetSymbol, assetByMint, assets } from "./assets";
import { decodeMarginEvents } from "./margin-events";
import { reserveAddress } from "./program-accounts";
import type { WalletTransaction } from "./wallet-transactions";

// One swap the margin account made, with the debt that was taken in the same transaction, if any. A long opens by
// borrowing USDC and a short by borrowing the stock, so the borrow is what ties a swap to a position.
export type MarginSwapRecord = {
  signature: string;
  blockTime: number;
  input: AssetSymbol;
  output: AssetSymbol;
  amountIn: bigint;
  amountOut: bigint;
  borrowed: { asset: AssetSymbol; amount: bigint } | null;
};

const reserveSymbols = new Map(assets.map((asset) => [reserveAddress(new PublicKey(asset.mint)).toBase58(), asset.symbol]));

export function marginSwapsFrom(transactions: readonly WalletTransaction[], margin: string): MarginSwapRecord[] {
  return transactions.flatMap(({ signature, blockTime, tx }) => {
    const { swaps, borrows } = decodeMarginEvents(tx.meta?.logMessages ?? []);
    const borrow = borrows.find((event) => event.margin === margin);
    const asset = borrow === undefined ? undefined : reserveSymbols.get(borrow.reserve);
    return swaps.flatMap((swap) => {
      const input = assetByMint.get(swap.inputMint);
      const output = assetByMint.get(swap.outputMint);
      if (swap.margin !== margin || !input || !output) return [];
      return [
        {
          signature,
          blockTime,
          input: input.symbol,
          output: output.symbol,
          amountIn: swap.amountIn,
          amountOut: swap.amountOut,
          borrowed: borrow !== undefined && asset !== undefined ? { asset, amount: borrow.assets } : null,
        },
      ];
    });
  });
}
