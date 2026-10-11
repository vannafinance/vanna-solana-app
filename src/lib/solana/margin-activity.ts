import { PublicKey } from "@solana/web3.js";

import { type AssetSymbol, assetByMint, assets } from "./assets";
import { decodeMarginEvents } from "./margin-events";
import { reserveAddress } from "./program-accounts";
import { succeededOnly, type WalletTransaction } from "./wallet-transactions";

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

// An order on an account with several positions is too big for one transaction: the borrow (with its deposit) is sent first
// and the swap in the next one. The borrow still belongs to that swap when it came right before it.
const BORROW_AHEAD_SECONDS = 300;

type Borrowed = NonNullable<MarginSwapRecord["borrowed"]>;

// Failed transactions swapped nothing, so they are left out. `transactions` are newest first, as they are fetched.
export function marginSwapsFrom(transactions: readonly WalletTransaction[], margin: string): MarginSwapRecord[] {
  let ahead: { at: number; borrowed: Borrowed } | null = null;

  return [...succeededOnly(transactions)].reverse().flatMap(({ signature, blockTime, tx }) => {
    const { swaps, borrows, liteOpened, liteClosed } = decodeMarginEvents(tx.meta?.logMessages ?? []);
    const event = borrows.find((candidate) => candidate.margin === margin);
    const asset = event === undefined ? undefined : reserveSymbols.get(event.reserve);
    const own: Borrowed | null = event !== undefined && asset !== undefined ? { asset, amount: event.assets } : null;

    if (swaps.length === 0) {
      // A Farm deploy borrows too, but it opens a Kamino position; only a plain borrow is the start of an order.
      if (own !== null) ahead = liteOpened.length === 0 && liteClosed.length === 0 ? { at: blockTime, borrowed: own } : null;
      return [];
    }

    const records = swaps.flatMap((swap) => {
      const input = assetByMint.get(swap.inputMint);
      const output = assetByMint.get(swap.outputMint);
      if (swap.margin !== margin || !input || !output) return [];
      // The borrow sent ahead pays for the swap that spends it, once.
      const sentAhead = own === null && ahead !== null && blockTime - ahead.at <= BORROW_AHEAD_SECONDS && ahead.borrowed.asset === input.symbol ? ahead.borrowed : null;
      if (sentAhead !== null) ahead = null;
      return [
        {
          signature,
          blockTime,
          input: input.symbol,
          output: output.symbol,
          amountIn: swap.amountIn,
          amountOut: swap.amountOut,
          borrowed: own ?? sentAhead,
        },
      ];
    });
    ahead = null;
    return records;
  });
}
