import { type Connection, ComputeBudgetProgram, PublicKey, type TransactionInstruction } from "@solana/web3.js";

import type { AssetInfo } from "./assets";
import { type YieldSymbol } from "./kamino";
import { liteReduceRedeemInstruction, liteReduceRepayInstruction, liteSupplyInstruction } from "./lite-instructions";
import { fetchLitePositions, resolveLitePosition } from "./lite-position";
import { borrowInstruction, depositCollateralInstruction, openDebtPositionInstruction, withdrawCollateralInstruction } from "./margin-instructions";
import { assetIndexOf, fetchMarginState, type MarginState, positionAccounts } from "./margin-state";
import { NoFarmPositionError } from "./perps-errors";
import { associatedTokenAddress, debtPositionAddress, marginAddress, reserveAddress, tokenProgramOf } from "./program-accounts";
import { assetsToDebtSharesUp, clockTimestamp, decodeReserveDebt, projectReserveDebt } from "./reserve-debt";
import { sendLargeInstructions } from "./send-large-transaction";
import type { SigningHooks } from "./send-transaction";
import { createAssociatedTokenAccountIdempotent } from "./token-instructions";

export type YieldAsset = AssetInfo & { symbol: YieldSymbol };

// Same limit as the web app's one transaction deploy: the deposit, the borrow and the Kamino supply share one budget.
const DEPLOY_COMPUTE_UNITS = 1_000_000;
const EXIT_COMPUTE_UNITS = 600_000;
const CLOCK_SYSVAR = new PublicKey("SysvarC1ock11111111111111111111111111111111");
const MAX_EXIT_BPS = 10_000;

export type FarmDeployRequest = {
  stock: AssetInfo;
  pool: YieldAsset;
  // Stock base units taken from the wallet as margin collateral.
  collateral: bigint;
  // Pool base units borrowed against it and supplied to Kamino; zero for a plain deposit.
  borrow: bigint;
};

async function ensureDebtPosition(connection: Connection, owner: PublicKey, asset: AssetInfo): Promise<TransactionInstruction[]> {
  const margin = marginAddress(owner);
  const exists = (await connection.getAccountInfo(debtPositionAddress(margin, reserveAddress(new PublicKey(asset.mint))), "confirmed")) !== null;
  return exists ? [] : [openDebtPositionInstruction({ authority: owner, asset })];
}

// The borrow mints debt shares on the program's own reserve. The supply that follows must attribute exactly those shares
// to the Kamino position, so they are computed here from the same reserve state the borrow is built against.
async function borrowedShares(connection: Connection, pool: AssetInfo, borrow: bigint): Promise<bigint> {
  const [reserveInfo, clockInfo] = await connection.getMultipleAccountsInfo([reserveAddress(new PublicKey(pool.mint)), CLOCK_SYSVAR], "confirmed");
  if (reserveInfo === null || clockInfo === null) throw new Error("The lending reserve could not be read");
  const reserve = decodeReserveDebt(reserveInfo.data);
  const { totalDebt } = projectReserveDebt(reserve, clockTimestamp(clockInfo.data));
  return assetsToDebtSharesUp(borrow, reserve.totalBorrowShares, totalDebt);
}

// Deposit the stock, borrow the pool asset against it and supply that into Kamino, all in one transaction so a failure
// anywhere leaves nothing half open. The stock stays as ordinary margin collateral; the debt is in the pool asset.
export async function buildFarmDeploy(connection: Connection, owner: PublicKey, request: FarmDeployRequest): Promise<TransactionInstruction[]> {
  const { stock, pool, collateral, borrow } = request;
  if (collateral <= 0n) throw new RangeError("Enter a deposit amount");
  if (borrow < 0n) throw new RangeError("The borrow amount is invalid");

  const state = await fetchMarginState(connection, marginAddress(owner));
  const stockMint = new PublicKey(stock.mint);
  const source = associatedTokenAddress(owner, stockMint, tokenProgramOf(stock));
  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: DEPLOY_COMPUTE_UNITS }),
    createAssociatedTokenAccountIdempotent(owner, source, owner, stockMint, tokenProgramOf(stock)),
    depositCollateralInstruction({ authority: owner, asset: stock, amount: collateral, source }),
  ];
  if (borrow === 0n) return instructions;

  // The deposit ahead of the borrow in this same transaction is not in the account yet, so the health scan is told to
  // count it, and the pool asset is excluded because the borrow names it itself.
  const remaining = await positionAccounts(connection, state, { excludeCollateral: [pool.symbol], excludeDebt: [pool.symbol], injectCollateral: stock.symbol });
  const litePosition = await resolveLitePosition(connection, state.margin, new PublicKey(pool.mint), assetIndexOf(state, pool.symbol), state.slots.lite);
  instructions.push(
    ...(await ensureDebtPosition(connection, owner, pool)),
    borrowInstruction({ authority: owner, asset: pool, amount: borrow, remaining }),
    liteSupplyInstruction({ owner, asset: pool, litePosition, amount: borrow, attributeSharesDelta: await borrowedShares(connection, pool, borrow) }),
  );
  return instructions;
}

export function deployFarm(connection: Connection, owner: PublicKey, request: FarmDeployRequest, hooks: SigningHooks): Promise<string> {
  return buildFarmDeploy(connection, owner, request).then((instructions) => sendLargeInstructions(connection, owner, instructions, hooks));
}

export type FarmExitRequest = {
  pool: YieldAsset;
  // Basis points of the Kamino position to redeem: 2500, 5000, 7500 or 10000.
  exitBps: number;
};

// Redeem part of the Kamino position, repay the debt attributed to it, and send what is left to the wallet.
export async function buildFarmExit(connection: Connection, owner: PublicKey, request: FarmExitRequest, state?: MarginState): Promise<TransactionInstruction[]> {
  const { pool, exitBps } = request;
  if (!Number.isInteger(exitBps) || exitBps < 1 || exitBps > MAX_EXIT_BPS) throw new RangeError("Choose a close size between 1% and 100%");

  const margin = marginAddress(owner);
  const current = state ?? (await fetchMarginState(connection, margin));
  const mint = new PublicKey(pool.mint);
  const position = (await fetchLitePositions(connection, margin, current.slots.lite)).find((candidate) => candidate.mint.equals(mint));
  if (!position) throw new NoFarmPositionError();

  const userTokenAccount = associatedTokenAddress(owner, mint, tokenProgramOf(pool));
  const remaining = await positionAccounts(connection, current, { excludeDebt: [pool.symbol], excludeLite: position.address });
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: EXIT_COMPUTE_UNITS }),
    createAssociatedTokenAccountIdempotent(owner, userTokenAccount, owner, mint, tokenProgramOf(pool)),
    ...(await ensureDebtPosition(connection, owner, pool)),
    liteReduceRedeemInstruction({ owner, asset: pool, litePosition: position.address, exitBps, minUnderlyingOut: 0n }),
    liteReduceRepayInstruction({ owner, asset: pool, litePosition: position.address, exitBps, userTokenAccount, remaining }),
  ];
}

export function exitFarm(connection: Connection, owner: PublicKey, request: FarmExitRequest, hooks: SigningHooks): Promise<string> {
  return buildFarmExit(connection, owner, request).then((instructions) => sendLargeInstructions(connection, owner, instructions, hooks));
}

// A second transaction on purpose: it reads the account as the exit left it, so the health scan is right whether or not
// another position still borrows the same asset.
export async function buildStockWithdrawal(connection: Connection, owner: PublicKey, stock: AssetInfo, amount: bigint): Promise<TransactionInstruction[]> {
  if (amount <= 0n) throw new RangeError("There is no collateral to return");
  const state = await fetchMarginState(connection, marginAddress(owner));
  const mint = new PublicKey(stock.mint);
  const destination = associatedTokenAddress(owner, mint, tokenProgramOf(stock));
  const remaining = await positionAccounts(connection, state, { excludeCollateral: [stock.symbol] });
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: EXIT_COMPUTE_UNITS }),
    createAssociatedTokenAccountIdempotent(owner, destination, owner, mint, tokenProgramOf(stock)),
    withdrawCollateralInstruction({ authority: owner, asset: stock, amount, destination, remaining }),
  ];
}

export function withdrawStock(connection: Connection, owner: PublicKey, stock: AssetInfo, amount: bigint, hooks: SigningHooks): Promise<string> {
  return buildStockWithdrawal(connection, owner, stock, amount).then((instructions) => sendLargeInstructions(connection, owner, instructions, hooks));
}
