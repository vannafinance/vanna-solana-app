import type { TokenAmount } from "@/format/format-amount";
import type { CloseQuote, ExitFractionBps, FarmPosition, FarmPositionView, FarmPositionsView } from "@/types/farm";

import { netAprBps } from "./farm-math";
import { scaleAmount, sumAmounts, toUsd } from "./units";

// Everything the position holds against what it owes: the stock plus what Kamino holds, over the debt.
function healthOf(assetsUsd: bigint, debtUsd: bigint): number | null {
  return debtUsd > 0n ? Number(assetsUsd) / Number(debtUsd) : null;
}

export function toPositionView(position: FarmPosition): FarmPositionView {
  const debt = sumAmounts(position.principal, position.interest);
  const collateralValueUsd = toUsd(position.collateral, position.collateralPriceUsd);
  const debtValueUsd = toUsd(debt, position.poolPriceUsd);
  const suppliedValueUsd = toUsd(position.supplied, position.poolPriceUsd);
  const yieldEarned: TokenAmount = { raw: position.supplied.raw > position.principal.raw ? position.supplied.raw - position.principal.raw : 0n, decimals: position.supplied.decimals };

  return {
    id: position.id,
    collateralSymbol: position.collateralSymbol,
    poolSymbol: position.poolSymbol,
    leverage: position.leverage,
    healthFactor: healthOf(collateralValueUsd + suppliedValueUsd, debtValueUsd) ?? Number.POSITIVE_INFINITY,
    collateral: position.collateral,
    collateralValueUsd,
    principal: position.principal,
    interest: position.interest,
    debt,
    debtValueUsd,
    supplied: position.supplied,
    suppliedValueUsd,
    yieldEarned,
    earningsUsd: toUsd(yieldEarned, position.poolPriceUsd),
    netValueUsd: collateralValueUsd + suppliedValueUsd - debtValueUsd,
    supplyApyBps: position.supplyApyBps,
    borrowApyBps: position.borrowApyBps,
    netAprBps: netAprBps(position.supplyApyBps, position.borrowApyBps),
  };
}

export function summarisePositions(positions: readonly FarmPosition[]): FarmPositionsView {
  const views = positions.map(toPositionView);
  const totalDebt = views.reduce((sum, view) => sum + view.debtValueUsd, 0n);
  const weightedApr = views.reduce((sum, view) => sum + BigInt(view.netAprBps) * view.debtValueUsd, 0n);

  return {
    netValueUsd: views.reduce((sum, view) => sum + view.netValueUsd, 0n),
    earningsUsd: views.reduce((sum, view) => sum + view.earningsUsd, 0n),
    netAprBps: totalDebt > 0n ? Number(weightedApr / totalDebt) : 0,
    positions: views,
  };
}

export function closeQuote(position: FarmPosition, fractionBps: ExitFractionBps): CloseQuote {
  const fraction = BigInt(fractionBps);
  const debt = sumAmounts(position.principal, position.interest);
  const redeem = scaleAmount(position.supplied, fraction);
  // Interest keeps accruing on its own schedule, so the debt can round a few units past what Kamino returns; the program
  // never repays more than it redeemed.
  const owed = scaleAmount(debt, fraction);
  const repay: TokenAmount = owed.raw > redeem.raw ? redeem : owed;
  // The stock only goes back to the wallet when the whole position is closed; a partial close leaves it as collateral.
  const collateralReturned: TokenAmount = fractionBps === 10000 ? position.collateral : { raw: 0n, decimals: position.collateral.decimals };
  const leftover: TokenAmount = { raw: redeem.raw - repay.raw, decimals: redeem.decimals };
  const remainingDebt: TokenAmount = { raw: debt.raw - repay.raw, decimals: debt.decimals };
  const collateralReturnedValueUsd = toUsd(collateralReturned, position.collateralPriceUsd);

  return {
    fractionBps,
    redeem,
    redeemValueUsd: toUsd(redeem, position.poolPriceUsd),
    repay,
    repayValueUsd: toUsd(repay, position.poolPriceUsd),
    collateralReturned,
    collateralReturnedValueUsd,
    leftover,
    remainingDebtValueUsd: toUsd(remainingDebt, position.poolPriceUsd),
    healthAfter: fractionBps === 10000 ? null : healthOf(toUsd(position.collateral, position.collateralPriceUsd) + toUsd(scaleAmount(position.supplied, BigInt(10000 - fractionBps)), position.poolPriceUsd), toUsd(remainingDebt, position.poolPriceUsd)),
    receiveValueUsd: collateralReturnedValueUsd + toUsd(leftover, position.poolPriceUsd),
  };
}
