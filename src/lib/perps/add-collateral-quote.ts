import type { AddCollateralQuote, PerpsAccount, PositionSummary } from "@/types/perps";

import { liquidationPrice } from "./position-math";

export function quoteAddCollateral(position: PositionSummary, account: PerpsAccount, amount: bigint): AddCollateralQuote {
  const collateralAfter = position.collateral + amount;
  return {
    amount,
    collateralAfter,
    liquidationAfter: liquidationPrice({
      side: position.side,
      tokens: position.tokens,
      collateral: collateralAfter,
      openNotional: position.collateral * BigInt(position.leverage),
    }),
    availableAfter: account.available - amount,
  };
}
