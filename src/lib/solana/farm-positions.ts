import { type Connection, PublicKey } from "@solana/web3.js";

import { assetByMint } from "./assets";
import { isYieldSymbol, kaminoReceiptValue, kaminoReserveOf, type YieldSymbol } from "./kamino";
import { fetchLitePositions } from "./lite-position";
import { fetchMarginState } from "./margin-state";
import { MarginAccountMissingError } from "./perps-errors";
import { debtPositionAddress, marginAddress, reserveAddress } from "./program-accounts";
import { ceilDiv, clockTimestamp, decodeDebtShares, decodeReserveDebt, projectReserveDebt } from "./reserve-debt";

const CLOCK_SYSVAR = new PublicKey("SysvarC1ock11111111111111111111111111111111");

export type KaminoPosition = {
  pool: YieldSymbol;
  // The pool asset the position's receipts redeem for today, in base units.
  supplied: bigint;
  // What the margin account owes for this position, interest included, in base units.
  debt: bigint;
  // The program's own borrow rate for the pool asset.
  borrowRateBps: number;
};

// Reads every Kamino position of a wallet's margin account straight from the chain. A wallet without a margin account
// simply has none.
export async function fetchKaminoPositions(connection: Connection, owner: PublicKey): Promise<KaminoPosition[]> {
  const margin = marginAddress(owner);
  const state = await fetchMarginState(connection, margin).catch((error: unknown) => {
    if (error instanceof MarginAccountMissingError) return null;
    throw error;
  });
  if (state === null) return [];

  const positions = await fetchLitePositions(connection, margin, state.slots.lite);
  return Promise.all(
    positions.map(async (position) => {
      const asset = assetByMint.get(position.mint.toBase58());
      if (!asset || !isYieldSymbol(asset.symbol)) throw new Error("A Kamino position holds an asset the app does not support");
      const reserve = reserveAddress(position.mint);
      const [kamino, vanna, debtPosition, clock] = await connection.getMultipleAccountsInfo(
        [kaminoReserveOf(asset.symbol).reserve, reserve, debtPositionAddress(margin, reserve), CLOCK_SYSVAR],
        "confirmed",
      );
      if (!kamino || !vanna || !clock) throw new Error("A Kamino position could not be read");

      const reserveDebt = decodeReserveDebt(vanna.data);
      const { totalDebt, rateBps } = projectReserveDebt(reserveDebt, clockTimestamp(clock.data));
      const outstanding = debtPosition ? decodeDebtShares(debtPosition.data) : 0n;
      // A position opened before debt was attributed to it owns the debt only while it still has some.
      const attributed = position.trackedShares === null ? (position.deposited > position.equity ? outstanding : 0n) : position.trackedShares;
      const shares = attributed < outstanding ? attributed : outstanding;

      return {
        pool: asset.symbol,
        supplied: kaminoReceiptValue(kamino.data, position.mint, asset.symbol, position.receipts),
        debt: reserveDebt.totalBorrowShares === 0n ? 0n : ceilDiv(shares * totalDebt, reserveDebt.totalBorrowShares),
        borrowRateBps: Number(rateBps),
      };
    }),
  );
}
