import { type Connection, PublicKey, type TransactionInstruction } from "@solana/web3.js";

import { fetchAccountSnapshot } from "./account-api";
import type { AssetInfo } from "./assets";
import { repayFromMarginInstruction, withdrawCollateralInstruction } from "./margin-instructions";
import { buildMarginSwap, type MarginSwapBuild } from "./margin-swap";
import { fetchMarginState, positionAccounts } from "./margin-state";
import { NoPositionError } from "./perps-errors";
import { fetchPerpsQuote, type Side, usdcAsset } from "./perps-transactions";
import { associatedTokenAddress, marginAddress, tokenProgramOf } from "./program-accounts";
import { withStalePoolRetry } from "./retry-stale-pool";
import { type SigningHooks, sendInstructions } from "./send-transaction";
import { createAssociatedTokenAccountIdempotent } from "./token-instructions";
import { inputTransferFee } from "./transfer-fee";

export type ClosePositionRequest = {
  side: Side;
  stock: AssetInfo;
  // Whole percent, 1 to 100.
  exitPercent: number;
  // USD units per whole token, for sizing a short's buy-back.
  stockPrice: bigint;
  // A long's own share of the pooled USDC debt, in USD units. Closing one long must never repay another position's debt.
  debtShareUsd: bigint;
};

const USDC_DUST = 5_000n;
const MAX_REQUOTES = 2;

const min = (a: bigint, b: bigint) => (a < b ? a : b);

async function withdrawTo(connection: Connection, owner: PublicKey, asset: AssetInfo, amount: bigint, state: Awaited<ReturnType<typeof fetchMarginState>>, exclude: { collateral: AssetInfo["symbol"][]; debt: AssetInfo["symbol"][] }): Promise<TransactionInstruction[]> {
  const mint = new PublicKey(asset.mint);
  const destination = associatedTokenAddress(owner, mint, tokenProgramOf(asset));
  const remaining = await positionAccounts(connection, state, { excludeCollateral: exclude.collateral, excludeDebt: exclude.debt });
  return [createAssociatedTokenAccountIdempotent(owner, destination, owner, mint, tokenProgramOf(asset)), withdrawCollateralInstruction({ authority: owner, asset, amount, destination, remaining })];
}

// Sell the stock collateral, repay this long's share of the USDC debt, send what is left to the wallet. The swap's real
// proceeds are only known once it has run, so repay and withdraw are sized from the quote's guaranteed minimum: a repay
// that covers the whole pool uses repay-all, and any estimation error lands in a slightly smaller withdrawal.
async function buildCloseLong(connection: Connection, owner: PublicKey, request: ClosePositionRequest): Promise<MarginSwapBuild> {
  const { stock } = request;
  const usdc = usdcAsset();
  const percent = BigInt(request.exitPercent);
  const [snapshot, state] = await Promise.all([fetchAccountSnapshot(owner.toBase58()), fetchMarginState(connection, marginAddress(owner))]);
  const held = snapshot.collateralBalances[stock.symbol] ?? 0n;
  if (held <= 0n) throw new NoPositionError("long");

  const gross = (held * percent) / 100n;
  const net = gross - (await inputTransferFee(connection, stock, gross));
  const usdcDebt = snapshot.borrowedBalances.USDC ?? 0n;
  const targetDebt = min(usdcDebt, (request.debtShareUsd * percent) / 100n);
  // Repay-all reads the exact debt on-chain, which is only right when this long is the account's only USDC borrower.
  const soleBorrower = percent === 100n && usdcDebt > 0n && targetDebt * 1000n >= usdcDebt * 999n;

  const { quote, response } = await fetchPerpsQuote(stock, usdc, net);
  const swap = await buildMarginSwap(connection, { quote: response, owner, state, grossAmountIn: gross });
  const guaranteed = quote.minReceived;

  const instructions = [...swap.instructions];
  let repaid = 0n;
  let repaidAll = false;
  if (targetDebt > 0n) {
    repaidAll = soleBorrower && guaranteed >= usdcDebt;
    // A shared pool cannot use repay-all, so the share is padded 0.1% for interest accrued since it was read.
    repaid = repaidAll ? usdcDebt : min(min(guaranteed, (targetDebt * 1001n) / 1000n), usdcDebt);
    instructions.push(repayFromMarginInstruction({ authority: owner, asset: usdc, maxAssets: repaid, repayAll: repaidAll }));
  }

  const leftover = guaranteed - repaid;
  if (leftover > USDC_DUST) {
    // A full close swaps away the whole stock balance and a repay-all clears the debt slot, both earlier in this same
    // transaction, so the withdraw's position scan must leave them out.
    instructions.push(...(await withdrawTo(connection, owner, usdc, leftover, state, { collateral: percent === 100n ? ["USDC", stock.symbol] : ["USDC"], debt: repaidAll ? ["USDC"] : [] })));
  }
  return { instructions, tables: swap.tables };
}

// Buy the stock back with USDC collateral, repay the stock debt, send any stock left over to the wallet. A fee-charging
// Token-2022 stock loses its fee twice on the way to the reserve (end of the swap, then the repay), so the buy is sized
// to cover the debt plus the repay-leg fee from the swap's guaranteed output, growing the USDC side by at most two re-quotes.
async function buildCloseShort(connection: Connection, owner: PublicKey, request: ClosePositionRequest): Promise<MarginSwapBuild> {
  const { stock, stockPrice } = request;
  const usdc = usdcAsset();
  const percent = BigInt(request.exitPercent);
  if (stockPrice <= 0n) throw new NoPositionError("short");
  const [snapshot, state] = await Promise.all([fetchAccountSnapshot(owner.toBase58()), fetchMarginState(connection, marginAddress(owner))]);
  const stockDebt = snapshot.borrowedBalances[stock.symbol] ?? 0n;
  if (stockDebt <= 0n) throw new NoPositionError("short");

  const toRepay = (stockDebt * percent) / 100n;
  const usdcAvailable = snapshot.collateralBalances.USDC ?? 0n;
  const repayFee = await inputTransferFee(connection, stock, toRepay);
  const vaultNeeded = toRepay + repayFee + (repayFee > 0n ? 1n : 0n);
  const scale = 10n ** BigInt(stock.decimals);
  // Value of what must be bought, with the same 1% headroom as the web app for slippage and price impact.
  let usdcToSwap = min((stockPrice * vaultNeeded * 101n) / (100n * scale), usdcAvailable);
  if (usdcToSwap <= 0n) throw new NoPositionError("short");

  let quote;
  let vaultReceives = 0n;
  for (let attempt = 0; ; attempt++) {
    quote = await fetchPerpsQuote(usdc, stock, usdcToSwap);
    vaultReceives = quote.quote.minReceived - (await inputTransferFee(connection, stock, quote.quote.minReceived));
    if (vaultReceives >= vaultNeeded || usdcToSwap >= usdcAvailable - 1n || attempt >= MAX_REQUOTES) break;
    usdcToSwap = min(usdcAvailable, (usdcToSwap * vaultNeeded * 1003n) / ((vaultReceives > 1n ? vaultReceives : 1n) * 1000n));
  }
  const swap = await buildMarginSwap(connection, { quote: quote.response, owner, state });

  const instructions = [...swap.instructions];
  const repaidAll = percent === 100n && vaultReceives >= vaultNeeded;
  const repaid = repaidAll ? stockDebt : vaultReceives;
  instructions.push(repayFromMarginInstruction({ authority: owner, asset: stock, maxAssets: repaid, repayAll: repaidAll }));

  // A full repay also pulls the repay-leg fee out of the vault, so only what is guaranteed beyond that is safe to send.
  const leftover = repaidAll ? vaultReceives - vaultNeeded : vaultReceives - repaid;
  if (leftover > 5n * 10n ** BigInt(Math.max(stock.decimals - 6, 0))) {
    const usdcDrained = usdcToSwap >= usdcAvailable - 1n;
    instructions.push(...(await withdrawTo(connection, owner, stock, leftover, state, { collateral: usdcDrained ? [stock.symbol, "USDC"] : [stock.symbol], debt: repaidAll ? [stock.symbol] : [] })));
  }
  return { instructions, tables: swap.tables };
}

export function buildClosePosition(connection: Connection, owner: PublicKey, request: ClosePositionRequest): Promise<MarginSwapBuild> {
  if (!Number.isInteger(request.exitPercent) || request.exitPercent < 1 || request.exitPercent > 100) throw new RangeError("Choose a close size between 1% and 100%");
  return request.side === "long" ? buildCloseLong(connection, owner, request) : buildCloseShort(connection, owner, request);
}

// The quote is fetched again on every attempt: a pool the fork cloned earlier can drift from an older quote.
export function closePosition(connection: Connection, owner: PublicKey, request: ClosePositionRequest, hooks: SigningHooks): Promise<string> {
  return withStalePoolRetry(hooks, async (tracked) => {
    const { instructions, tables } = await buildClosePosition(connection, owner, request);
    return sendInstructions(connection, owner, instructions, tracked, tables);
  });
}
