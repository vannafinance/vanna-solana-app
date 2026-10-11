import { type AddressLookupTableAccount, type Connection, PublicKey, type TransactionInstruction } from "@solana/web3.js";

import { type AssetInfo, assets } from "./assets";
import { fetchRawJupiterQuote, NoRouteError, type RawJupiterQuote } from "./jupiter-quote";
import { KAMINO_EXTRA_LOOKUP_TABLES, KAMINO_LOOKUP_TABLE, VANNA_LOOKUP_TABLE } from "./kamino";
import { fetchLookupTables } from "./lookup-tables";
import { borrowInstruction, depositCollateralInstruction, openDebtPositionInstruction } from "./margin-instructions";
import { buildMarginSwap, MARGIN_SWAP_COMPUTE_UNITS } from "./margin-swap";
import { PriceImpactError } from "./perps-errors";
import { fetchMarginState, type MarginState, positionAccounts } from "./margin-state";
import { associatedTokenAddress, debtPositionAddress, marginAddress, reserveAddress, tokenProgramOf } from "./program-accounts";
import { withStalePoolRetry } from "./retry-stale-pool";
import { fitsOneTransaction, sendBatches } from "./send-batches";
import type { SigningHooks } from "./send-transaction";
import { createAssociatedTokenAccountIdempotent } from "./token-instructions";
import { inputTransferFee } from "./transfer-fee";

export type Side = "long" | "short";

// Same constants as the web app's long/short box, so a position opens the same way on both.
export const MAX_LEVERAGE = 5;
const SWAP_SLIPPAGE_BPS = 100;
const MAX_ACCOUNTS_LADDER = [20, 32, 44] as const;
// Simpler routes, tried only when the usual one makes the swap too large for one transaction on an account that holds
// many positions (the swap lists every one of them), before a lookup table made on the fork that Solflare refuses.
export const COMPACT_ROUTE_LADDER = [16, 12, 8] as const;
const MAX_PRICE_IMPACT_BPS = 500;

export type OpenPositionRequest = {
  side: Side;
  stock: AssetInfo;
  // USDC for a long, the stock itself for a short, in base units taken from the wallet.
  collateral: bigint;
  leverage: number;
};

export function usdcAsset(): AssetInfo {
  const asset = assets.find((candidate) => candidate.symbol === "USDC");
  if (!asset) throw new Error("USDC is not configured");
  return asset;
}

// A smaller route keeps the whole deposit, borrow and swap transaction small, so the smallest account budget that gives
// an acceptable price impact wins. Only "no route" and too-costly routes move on to the next budget.
export async function fetchPerpsQuote(input: AssetInfo, output: AssetInfo, amount: bigint, ladder: readonly number[] = MAX_ACCOUNTS_LADDER): Promise<RawJupiterQuote> {
  let last: unknown = new NoRouteError();
  for (const maxAccounts of ladder) {
    try {
      const quote = await fetchRawJupiterQuote(input.mint, output.mint, amount, SWAP_SLIPPAGE_BPS, undefined, maxAccounts);
      if (quote.quote.priceImpactBps <= MAX_PRICE_IMPACT_BPS) return quote;
      last = new PriceImpactError(quote.quote.priceImpactBps);
    } catch (error) {
      if (!(error instanceof NoRouteError)) throw error;
      last = error;
    }
  }
  throw last;
}

// A token that charges a Token-2022 transfer fee loses it on the deposit, on the borrow and again on the swap's first
// leg, so the vault holds less than deposit plus borrow and the quote must be sized from what really arrives.
async function vaultSizes(connection: Connection, base: AssetInfo, collateral: bigint, borrow: bigint): Promise<{ vaultAmount: bigint; swapAmount: bigint }> {
  const [depositFee, borrowFee] = await Promise.all([inputTransferFee(connection, base, collateral), borrow > 0n ? inputTransferFee(connection, base, borrow) : Promise.resolve(0n)]);
  const vaultAmount = collateral - depositFee + (borrow - borrowFee);
  return { vaultAmount, swapAmount: vaultAmount - (await inputTransferFee(connection, base, vaultAmount)) };
}

// How far an order got, so trying again after it stopped does not deposit or borrow a second time. An order is up to three
// legs: the deposit, the borrow and the swap. A leg that has landed stays in the margin account whatever happens next.
export type OpenProgress = { landed: number };

export const freshOpenProgress = (): OpenProgress => ({ landed: 0 });

async function depositAndBorrow(
  connection: Connection,
  owner: PublicKey,
  state: MarginState,
  asset: AssetInfo,
  deposit: bigint,
  borrow: bigint,
): Promise<{ deposit: TransactionInstruction[]; borrow: TransactionInstruction[] }> {
  const mint = new PublicKey(asset.mint);
  const source = associatedTokenAddress(owner, mint, tokenProgramOf(asset));
  const depositLeg = [createAssociatedTokenAccountIdempotent(owner, source, owner, mint, tokenProgramOf(asset)), depositCollateralInstruction({ authority: owner, asset, amount: deposit, source })];
  if (borrow <= 0n) return { deposit: depositLeg, borrow: [] };

  const margin = marginAddress(owner);
  const remaining = await positionAccounts(connection, state, { excludeCollateral: [asset.symbol], excludeDebt: [asset.symbol] });
  const borrowLeg: TransactionInstruction[] = [];
  if ((await connection.getAccountInfo(debtPositionAddress(margin, reserveAddress(mint)), "confirmed")) === null) {
    borrowLeg.push(openDebtPositionInstruction({ authority: owner, asset }));
  }
  borrowLeg.push(borrowInstruction({ authority: owner, asset, amount: borrow, remaining }));
  return { deposit: depositLeg, borrow: borrowLeg };
}

export type OpenBuild = { legs: TransactionInstruction[][]; tables: AddressLookupTableAccount[] };

// Long: deposit USDC, borrow more USDC to the chosen leverage, swap the total into the stock. Short: the same with the
// stock on the deposit and borrow side, swapped into USDC. The legs share one transaction when they fit, so a route that
// would fail is caught by the simulation before the wallet is asked to sign. An account that already holds positions makes
// the borrow and the swap carry a long list of accounts to check, and then the legs go as several transactions that the
// wallet approves together.
export async function buildOpenPosition(connection: Connection, owner: PublicKey, request: OpenPositionRequest, progress: OpenProgress = freshOpenProgress()): Promise<OpenBuild> {
  const { side, stock, collateral, leverage } = request;
  if (collateral <= 0n) throw new RangeError("Enter a collateral amount");
  if (!Number.isInteger(leverage) || leverage < 1 || leverage > MAX_LEVERAGE) throw new RangeError("Leverage is outside the allowed range");

  const base = side === "long" ? usdcAsset() : stock;
  const target = side === "long" ? stock : usdcAsset();
  const borrow = collateral * BigInt(leverage - 1);

  // The account read and the fee sizing do not depend on each other, and neither do the deposit and borrow instructions
  // and the route quote, so each pair waits together instead of one after the other.
  const [state, sizes] = await Promise.all([fetchMarginState(connection, marginAddress(owner)), vaultSizes(connection, base, collateral, borrow)]);
  const [depositBorrow, { response }, kamino] = await Promise.all([
    depositAndBorrow(connection, owner, state, base, collateral, borrow),
    fetchPerpsQuote(base, target, sizes.swapAmount),
    fetchLookupTables(connection, [VANNA_LOOKUP_TABLE, KAMINO_LOOKUP_TABLE, ...KAMINO_EXTRA_LOOKUP_TABLES]),
  ]);
  const { vaultAmount } = sizes;
  const swapFor = async (quote: unknown) => {
    const built = await buildMarginSwap(connection, { quote, owner, state, injectDebt: borrow > 0n ? base.symbol : undefined, grossAmountIn: vaultAmount });
    const [, ...instructions] = built.instructions;
    return { instructions, tables: [...built.tables, ...kamino] };
  };

  let swap = await swapFor(response);
  // Too large even without a compute budget: a simpler route lists fewer accounts. Each is tried in turn and the first that
  // fits is used; if none does, the usual route goes ahead with the fork table as before.
  if (!fitsOneTransaction(owner, swap.instructions, swap.tables)) {
    for (const maxAccounts of COMPACT_ROUTE_LADDER) {
      try {
        const compact = await swapFor((await fetchPerpsQuote(base, target, sizes.swapAmount, [maxAccounts])).response);
        if (fitsOneTransaction(owner, compact.instructions, compact.tables)) {
          swap = compact;
          break;
        }
      } catch {
        // No route this small, or one that costs too much: try the next size, then keep the usual route.
      }
    }
  }

  const legs = [depositBorrow.deposit, ...(depositBorrow.borrow.length > 0 ? [depositBorrow.borrow] : []), swap.instructions];
  return { legs: legs.slice(progress.landed), tables: swap.tables };
}

// The quote is fetched again on every attempt: a pool the fork cloned earlier can drift from an older quote.
export function openPosition(connection: Connection, owner: PublicKey, request: OpenPositionRequest, hooks: SigningHooks, progress: OpenProgress = freshOpenProgress()): Promise<string> {
  return withStalePoolRetry(hooks, async (tracked) => {
    const alreadyLanded = progress.landed;
    const { legs, tables } = await buildOpenPosition(connection, owner, request, progress);
    return sendBatches(
      connection,
      owner,
      // The deposit and the borrow are light; the swap, always last, is not.
      { computeUnits: MARGIN_SWAP_COMPUTE_UNITS, batches: legs, lightBatches: legs.map((_, index) => index < legs.length - 1), retrySafe: false, allowForkTable: true, tables, onLanded: (count) => (progress.landed = alreadyLanded + count) },
      tracked,
    );
  });
}
