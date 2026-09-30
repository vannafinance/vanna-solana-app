import type { TokenAmount } from "@/format/format-amount";
import type { CloseQuote, DeployForm, ExitFractionBps, FarmPosition, FarmPositionView, FarmPositionsView } from "@/types/farm";

import { healthFactor, netAprBps } from "./farm-math";
import { BPS, scaleAmount, sumAmounts, toUsd } from "./units";

export function toPositionView(position: FarmPosition): FarmPositionView {
  const debt = sumAmounts(position.principal, position.interest);
  const collateralValueUsd = toUsd(position.collateral, position.collateralPriceUsd);
  const debtValueUsd = toUsd(debt, position.poolPriceUsd);
  const suppliedValueUsd = toUsd(position.supplied, position.poolPriceUsd);
  const yieldEarned: TokenAmount = { raw: position.supplied.raw - position.principal.raw, decimals: position.supplied.decimals };

  return {
    id: position.id,
    collateralSymbol: position.collateralSymbol,
    poolSymbol: position.poolSymbol,
    leverage: position.leverage,
    healthFactor: healthFactor(position.leverage) ?? Number.POSITIVE_INFINITY,
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
  const repay = scaleAmount(debt, fraction);
  const collateralReturned = scaleAmount(position.collateral, fraction);
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
    healthAfter: fractionBps === 10000 ? null : healthFactor(position.leverage),
    receiveValueUsd: collateralReturnedValueUsd + toUsd(leftover, position.poolPriceUsd),
  };
}

export function reducePosition(position: FarmPosition, fractionBps: ExitFractionBps): FarmPosition | null {
  if (fractionBps === 10000) return null;
  const remaining = BPS - BigInt(fractionBps);
  return {
    ...position,
    collateral: scaleAmount(position.collateral, remaining),
    principal: scaleAmount(position.principal, remaining),
    interest: scaleAmount(position.interest, remaining),
    supplied: scaleAmount(position.supplied, remaining),
  };
}

export function positionFromDeploy(id: string, form: DeployForm, collateral: TokenAmount): FarmPosition {
  return {
    id,
    collateralSymbol: form.collateral.symbol,
    poolSymbol: form.pool.symbol,
    leverage: form.leverage,
    collateral,
    collateralPriceUsd: form.collateral.priceUsd,
    principal: form.quote.borrow,
    interest: { raw: 0n, decimals: form.quote.borrow.decimals },
    supplied: form.quote.borrow,
    poolPriceUsd: form.pool.priceUsd,
    supplyApyBps: form.pool.supplyApyBps,
    borrowApyBps: form.pool.borrowApyBps,
  };
}
