import type { AddCollateralQuote, PerpsMarket, PositionSummary } from "@/types/perps";

import { estimatedLiquidationPrice } from "./order-quote";

type Input = {
  position: PositionSummary;
  market: PerpsMarket;
  // What the wallet holds in USDC, in USD units.
  walletUsdc: bigint;
  amount: bigint;
};

// The deposit adds to the position's equity, which lowers its leverage; the liquidation estimate is the same isolated
// one the web app uses, taken at the new leverage.
export function quoteAddCollateral({ position, market, walletUsdc, amount }: Input): AddCollateralQuote {
  const collateralAfter = position.collateral + amount;
  const notional = position.side === "long" ? position.sizeUsd : position.sizeUsd + position.collateral;
  const leverageAfter = collateralAfter > 0n ? Number(notional) / Number(collateralAfter) : 0;
  const borrowBps = position.side === "long" ? market.usdcBorrowBps : market.tokenBorrowBps;
  return {
    amount,
    collateralAfter,
    liquidationAfter: estimatedLiquidationPrice(position.side, position.entryPrice, leverageAfter, borrowBps),
    availableAfter: walletUsdc - amount,
  };
}
