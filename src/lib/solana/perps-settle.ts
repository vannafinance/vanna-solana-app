import { ComputeBudgetProgram, type Connection, type PublicKey } from "@solana/web3.js";

import { fetchAccountSnapshot } from "./account-api";
import type { AssetInfo } from "./assets";
import { repayFromMarginInstruction } from "./margin-instructions";
import { NoPositionError } from "./perps-errors";
import { sendInstructions, type SigningHooks } from "./send-transaction";
import { inputTransferFee } from "./transfer-fee";

const SETTLE_COMPUTE_UNITS = 200_000;

// A short that stopped after its borrow leaves the stock both held and owed: no position shows, and either side's order is
// refused because the other seems open. Settling repays the debt from the stock already in the margin account, so what is
// left is plain collateral. Repaying only lowers debt, so it needs no health check and cannot hurt the account.
export async function buildSettle(connection: Connection, owner: PublicKey, stock: AssetInfo) {
  const snapshot = await fetchAccountSnapshot(connection, owner.toBase58());
  const owed = snapshot.borrowedBalances[stock.symbol] ?? 0n;
  const held = snapshot.collateralBalances[stock.symbol] ?? 0n;
  if (owed <= 0n || held <= 0n) throw new NoPositionError("short");
  // A token that charges a transfer fee loses it on the way from the vault to the reserve, so the vault must cover both.
  const fee = await inputTransferFee(connection, stock, owed);
  const repayAll = held >= owed + fee + 1n;
  const repaid = repayAll ? owed : held - (await inputTransferFee(connection, stock, held)) - 1n;
  if (repaid <= 0n) throw new NoPositionError("short");
  return [repayFromMarginInstruction({ authority: owner, asset: stock, maxAssets: repaid, repayAll })];
}

export async function settleStock(connection: Connection, owner: PublicKey, stock: AssetInfo, hooks: SigningHooks): Promise<string> {
  const instructions = await buildSettle(connection, owner, stock);
  return sendInstructions(connection, owner, [ComputeBudgetProgram.setComputeUnitLimit({ units: SETTLE_COMPUTE_UNITS }), ...instructions], hooks);
}
