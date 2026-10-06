import { type Connection, PublicKey } from "@solana/web3.js";

import type { MarginAccountSnapshot } from "@/types/account";

import { APP_ONLY_ASSETS, type AssetSymbol, assets } from "./assets";
import { readTokenAmount } from "./earn-deposits";
import type { OraclePrices } from "./oracle-prices";
import { associatedTokenAddress, debtPositionAddress, reserveAddress, tokenProgramOf } from "./program-accounts";
import { ApiError } from "./request-json";
import { ceilDiv, decodeDebtShares, decodeReserveDebt, projectReserveDebt } from "./reserve-debt";

type Balances = Partial<Record<AssetSymbol, bigint>>;

export type AppOnlyBalances = { collateral: Balances; debt: Balances };

// The web app's figures (lib/margin-health.ts): liquidation at a health factor of 1.1, and debt under a cent counts as none.
const LIQUIDATION_THRESHOLD = 1.1;
const DEBT_DUST_UNITS = 10_000n;
const USD_SCALE = 1_000_000;

const appOnly = assets.filter((asset) => APP_ONLY_ASSETS.has(asset.symbol));

// What the margin account holds and owes in the assets the hosted web app does not carry (SKR), read from the chain: the
// collateral is the margin account's own token account, the debt its debt shares in the reserve, with interest projected to
// `now` the way the program accrues it.
export async function fetchAppOnlyBalances(connection: Connection, margin: PublicKey, now: bigint): Promise<AppOnlyBalances> {
  const keys = appOnly.flatMap((asset) => {
    const mint = new PublicKey(asset.mint);
    const reserve = reserveAddress(mint);
    return [associatedTokenAddress(margin, mint, tokenProgramOf(asset)), reserve, debtPositionAddress(margin, reserve)];
  });
  const infos = await connection.getMultipleAccountsInfo(keys, "confirmed").catch(() => {
    throw new ApiError("network");
  });

  const balances: AppOnlyBalances = { collateral: {}, debt: {} };
  appOnly.forEach((asset, index) => {
    const [tokens, reserve, position] = infos.slice(index * 3, index * 3 + 3);
    const held = tokens === null ? 0n : readTokenAmount(tokens.data);
    if (held > 0n) balances.collateral[asset.symbol] = held;
    if (reserve === null || position === null) return;
    const shares = decodeDebtShares(position.data);
    const debt = decodeReserveDebt(reserve.data);
    if (shares === 0n || debt.totalBorrowShares === 0n) return;
    const owed = ceilDiv(shares * projectReserveDebt(debt, now).totalDebt, debt.totalBorrowShares);
    if (owed > 0n) balances.debt[asset.symbol] = owed;
  });
  return balances;
}

const valueOf = (symbol: AssetSymbol, raw: bigint, prices: OraclePrices): bigint => {
  const decimals = assets.find((asset) => asset.symbol === symbol)?.decimals ?? 0;
  const price = prices[symbol];
  // Without a price the account's figures would understate SKR, so they are not shown rather than shown wrong.
  if (price === undefined) throw new ApiError("invalid-response");
  return (raw * price) / 10n ** BigInt(decimals);
};

const total = (balances: Balances, prices: OraclePrices) =>
  (Object.entries(balances) as [AssetSymbol, bigint][]).reduce((sum, [symbol, raw]) => sum + valueOf(symbol, raw, prices), 0n);

// The hosted snapshot with the app-only balances added in, and the account figures worked out again with the web app's own
// formulas: health = collateral / debt, room = collateral - 1.1 x debt, net = collateral - debt. The web app does not read
// these assets at all, so nothing is counted twice; one it ever starts reporting is left as it reports it.
export function withAppOnlyBalances(snapshot: MarginAccountSnapshot, extra: AppOnlyBalances, prices: OraclePrices): MarginAccountSnapshot {
  if (!snapshot.hasMarginAccount) return snapshot;
  const unreported = (balances: Balances, reported: Balances): Balances =>
    Object.fromEntries(Object.entries(balances).filter(([symbol]) => reported[symbol as AssetSymbol] === undefined));
  const addedCollateral = unreported(extra.collateral, snapshot.collateralBalances);
  const addedDebt = unreported(extra.debt, snapshot.borrowedBalances);
  if (Object.keys(addedCollateral).length === 0 && Object.keys(addedDebt).length === 0) return snapshot;

  const collateral = snapshot.collateral + total(addedCollateral, prices);
  const borrowed = snapshot.borrowed + total(addedDebt, prices);
  const effectiveDebt = borrowed > DEBT_DUST_UNITS ? borrowed : 0n;
  const net = collateral > effectiveDebt ? collateral - effectiveDebt : 0n;
  const dollars = (units: bigint) => Number(units) / USD_SCALE;
  const room = dollars(collateral) - dollars(effectiveDebt) * LIQUIDATION_THRESHOLD;

  return {
    ...snapshot,
    collateral,
    borrowed,
    netAvailable: net,
    roomBeforeLiquidation: room > 0 ? BigInt(Math.round(room * USD_SCALE)) : 0n,
    health: effectiveDebt > 0n ? dollars(collateral) / dollars(effectiveDebt) : null,
    leverage: net > 0n ? dollars(collateral) / dollars(net) : collateral > 0n ? 1 : null,
    collateralBalances: { ...snapshot.collateralBalances, ...addedCollateral },
    borrowedBalances: { ...snapshot.borrowedBalances, ...addedDebt },
  };
}
