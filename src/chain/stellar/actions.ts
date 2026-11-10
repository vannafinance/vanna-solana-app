import {
  Asset,
  BASE_FEE,
  Keypair,
  nativeToScVal,
  Operation,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-base";

import { requireActiveRealWallet, signStellar } from "@/chain/sign";

import { fetchStellarAccount, findMarginAccount, lpReserves } from "./account";
import { CONTRACTS, EARN_POOLS, NETWORK_PASSPHRASE } from "./config";
import { readContract } from "./read";
import { rpc, sourceAccount, submitContract } from "./submit";

// External router & pool constants
// Ported from: apps/stellar/lib/stellar-utils.ts:CONTRACT_ADDRESSES
const BLEND_POOL = "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF";
const SOROSWAP_ROUTER = "CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD";
const AQUARIUS_ROUTER = "CBCFTQSPDBAIZ6R6PJQKSQWKNKWH2QIV3I4J72SHWBIK3ADRRAM5A6GD";
const AQUARIUS_POOL_INDEX_HEX = "9ac7a9cde23ac2ada11105eeaa42e43c2ea8332ca0aa8f41f58d7160274d718e";

// Faucet constants
// Ported from: apps/stellar/lib/faucet-utils.ts
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const BLEND_FAUCET_URL = "https://ewqw4hx7oa.execute-api.us-east-1.amazonaws.com/getAssets";
const SOROSWAP_FAUCET_URL = "https://api.soroswap.finance/api/faucet";
const AQUARIUS_FAUCET_SECRET = "SBPQCB4DOUQ26OC43QNAA3ODZOGECHJUVHDHYRHKYPL4SA22RRYGHQCX";
const AQUARIUS_USDC_CODE = "USDC";
const AQUARIUS_USDC_ISSUER = "GAHPYWLK6YRN7CVYZOO4H3VDRZ7PVF5UJGLZCSPAEIKJE2XSWF5LAGER";

// Ported from: apps/stellar/lib/utils/sanitize-amount.ts:decimalAmountToWad
export function decimalAmountToWad(value: string): bigint {
  if (!value || value === ".") return 0n;
  const [wholeRaw = "0", fractionRaw = ""] = value.split(".");
  const whole = wholeRaw || "0";
  const fraction = fractionRaw.padEnd(18, "0").slice(0, 18);
  return BigInt(whole) * 1_000_000_000_000_000_000n + BigInt(fraction || "0");
}

// Ported from: apps/stellar/lib/utils/sanitize-amount.ts:numberAmountToWad
export function numberAmountToWad(n: number): bigint {
  if (!Number.isFinite(n) || n <= 0) return 0n;
  return decimalAmountToWad(n.toFixed(7));
}

// Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.normalizeContractTokenSymbol
export function normalizeContractTokenSymbol(tokenSymbol: string): string {
  const normalized = tokenSymbol?.toUpperCase();
  if (normalized === "BLUSDC" || normalized === "BLEND_USDC" || normalized === "USDC") {
    return "USDC";
  }
  if (normalized === "AQUSDC" || normalized === "AQUIRESUSDC" || normalized === "AQUARIUS_USDC") {
    return "AQUSDC";
  }
  if (normalized === "SOUSDC" || normalized === "SOROSWAPUSDC" || normalized === "SOROSWAP_USDC") {
    return "SOUSDC";
  }
  return normalized;
}

// Ported from: apps/stellar/lib/blend-utils.ts:buildExternalProtocolCallBytes, apps/stellar/lib/soroswap-utils.ts:buildExternalProtocolCallBytes, and apps/stellar/lib/aquarius-utils.ts:buildExternalProtocolCallBytes
function buildExternalProtocolCallBytes(
  routerAddress: string,
  action: "AddLiquidity" | "RemoveLiquidity" | "Swap" | "Deposit" | "Withdraw",
  tokensOut: string[],
  amountsOutWad: bigint[],
  marginAccountAddress: string,
  venue: "Soroswap" | "Aquarius" | "Blend",
  isTokenPair = true,
  feeFraction = 30,
): Buffer {
  const makeKey = (name: string) => xdr.ScVal.scvSymbol(name);
  const amountIn = xdr.ScVal.scvVec([]);
  const amountOut = xdr.ScVal.scvVec(amountsOutWad.map((amt) => nativeToScVal(amt.toString(), { type: "u256" })));
  const tokensIn = xdr.ScVal.scvVec([]);

  const tokensOutVal = xdr.ScVal.scvVec(
    tokensOut.map((t) => {
      if (venue === "Soroswap") return xdr.ScVal.scvSymbol(t === "USDC" ? "SOUSDC" : t);
      if (venue === "Aquarius") return xdr.ScVal.scvSymbol(t === "USDC" ? "AQUSDC" : t);
      return xdr.ScVal.scvSymbol(t);
    }),
  );

  const typeAction = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(action)]);

  // Entries must be strictly alphabetically sorted for canonical XDR ScMap encoding
  const scvMap = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({ key: makeKey("amount_in"), val: amountIn }),
    new xdr.ScMapEntry({ key: makeKey("amount_out"), val: amountOut }),
    new xdr.ScMapEntry({ key: makeKey("fee_fraction"), val: xdr.ScVal.scvU32(feeFraction) }),
    new xdr.ScMapEntry({ key: makeKey("is_token_pair"), val: xdr.ScVal.scvBool(isTokenPair) }),
    new xdr.ScMapEntry({ key: makeKey("margin_account"), val: nativeToScVal(marginAccountAddress, { type: "address" }) }),
    new xdr.ScMapEntry({ key: makeKey("min_liquidity_out"), val: nativeToScVal(0n, { type: "u256" }) }),
    new xdr.ScMapEntry({ key: makeKey("protocol_address"), val: nativeToScVal(routerAddress, { type: "address" }) }),
    new xdr.ScMapEntry({ key: makeKey("token_pair_ratio"), val: xdr.ScVal.scvU64(xdr.Uint64.fromString("0")) }),
    new xdr.ScMapEntry({ key: makeKey("tokens_in"), val: tokensIn }),
    new xdr.ScMapEntry({ key: makeKey("tokens_out"), val: tokensOutVal }),
    new xdr.ScMapEntry({ key: makeKey("type_action"), val: typeAction }),
  ]);

  return Buffer.from(scvMap.toXDR());
}

/**
 * a) Ensure the trader has a deployed margin smart account.
 * Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.createMarginAccount / createMarginAccountAttempt
 */
export async function ensureStellarMarginAccount(owner?: string): Promise<{ address: string; hash?: string }> {
  const user = owner ?? requireActiveRealWallet("stellar").full;
  const existing = await findMarginAccount(user);
  if (existing) {
    return { address: existing };
  }

  const hash = await submitContract(
    user,
    CONTRACTS.ACCOUNT_MANAGER,
    "create_account",
    [nativeToScVal(user, { type: "address" })],
    { feeMultiplier: 20 },
  );

  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const created = await findMarginAccount(user);
    if (created) {
      return { address: created, hash };
    }
  }

  throw new Error("Margin account created on-chain but could not be discovered via findMarginAccount");
}

/**
 * b) Deposit collateral into margin account.
 * Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.depositCollateralTokens
 */
export async function stellarDepositCollateral(sym: string, amount: number): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const { address: marginAddr } = await ensureStellarMarginAccount(wallet.full);
  const contractTokenSymbol = normalizeContractTokenSymbol(sym);
  const amountWad = numberAmountToWad(amount).toString();

  return submitContract(
    wallet.full,
    CONTRACTS.ACCOUNT_MANAGER,
    "deposit_collateral_tokens",
    [
      nativeToScVal(marginAddr, { type: "address" }),
      nativeToScVal(contractTokenSymbol, { type: "symbol" }),
      nativeToScVal(amountWad, { type: "u256" }),
    ],
    { feeMultiplier: 20 },
  );
}

/**
 * c) Withdraw collateral from margin account.
 * Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.withdrawCollateralBalance
 */
export async function stellarWithdrawCollateral(sym: string, amount: number): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const marginAddr = await findMarginAccount(wallet.full);
  if (!marginAddr) {
    throw new Error("No margin account found for this wallet. Create one or deposit collateral first.");
  }
  const contractTokenSymbol = normalizeContractTokenSymbol(sym);
  const amountWad = numberAmountToWad(amount).toString();

  return submitContract(
    wallet.full,
    CONTRACTS.ACCOUNT_MANAGER,
    "withdraw_collateral_balance",
    [
      nativeToScVal(marginAddr, { type: "address" }),
      nativeToScVal(contractTokenSymbol, { type: "symbol" }),
      nativeToScVal(amountWad, { type: "u256" }),
    ],
    { feeMultiplier: 50 },
  );
}

/**
 * d) Borrow tokens against margin account collateral.
 * Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.borrowTokens
 */
export async function stellarBorrow(sym: string, amount: number): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const marginAddr = await findMarginAccount(wallet.full);
  if (!marginAddr) {
    throw new Error("No margin account found. Create a margin account and deposit collateral before borrowing.");
  }
  const contractTokenSymbol = normalizeContractTokenSymbol(sym);
  const borrowAmountWad = numberAmountToWad(amount).toString();

  return submitContract(
    wallet.full,
    CONTRACTS.ACCOUNT_MANAGER,
    "borrow",
    [
      nativeToScVal(marginAddr, { type: "address" }),
      nativeToScVal(borrowAmountWad, { type: "u256" }),
      nativeToScVal(contractTokenSymbol, { type: "symbol" }),
    ],
    { feeMultiplier: 50 },
  );
}

/**
 * e) Deposit collateral and borrow in one atomic step (or sequential fallback).
 * Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.depositAndBorrow and apps/stellar/components/margin/mg-leverage.tsx:handleLeverageSubmit
 */
export async function stellarDepositAndBorrow(input: {
  depositSym: string;
  depositAmount: number;
  borrowSym?: string;
  borrowAmount?: number;
  multiplier?: number;
}): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const { address: marginAddr } = await ensureStellarMarginAccount(wallet.full);

  const depAmt = input.depositAmount;
  const borAmt = input.borrowAmount ?? (input.multiplier && input.multiplier > 1 ? depAmt * (input.multiplier - 1) : 0);

  if (depAmt > 0 && borAmt > 0) {
    const depSym = normalizeContractTokenSymbol(input.depositSym);
    const borSym = normalizeContractTokenSymbol(input.borrowSym ?? input.depositSym);
    const isCross = depSym !== borSym;
    const depWad = numberAmountToWad(depAmt).toString();
    const borWad = numberAmountToWad(borAmt).toString();

    try {
      if (isCross) {
        return await submitContract(
          wallet.full,
          CONTRACTS.ACCOUNT_MANAGER,
          "deposit_and_borrow_cross",
          [
            nativeToScVal(marginAddr, { type: "address" }),
            nativeToScVal(depWad, { type: "u256" }),
            nativeToScVal(depSym, { type: "symbol" }),
            nativeToScVal(borWad, { type: "u256" }),
            nativeToScVal(borSym, { type: "symbol" }),
          ],
          { feeMultiplier: 50 },
        );
      } else {
        return await submitContract(
          wallet.full,
          CONTRACTS.ACCOUNT_MANAGER,
          "deposit_and_borrow",
          [
            nativeToScVal(marginAddr, { type: "address" }),
            nativeToScVal(depWad, { type: "u256" }),
            nativeToScVal(borWad, { type: "u256" }),
            nativeToScVal(depSym, { type: "symbol" }),
          ],
          { feeMultiplier: 50 },
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/budget|exceededlimit|resource/i.test(msg)) {
        console.warn("[depositAndBorrow] Soroban budget exceeded; falling back to sequential deposit + borrow:", msg);
        await stellarDepositCollateral(input.depositSym, depAmt);
        return await stellarBorrow(input.borrowSym ?? input.depositSym, borAmt);
      }
      throw err;
    }
  } else if (depAmt > 0) {
    return stellarDepositCollateral(input.depositSym, depAmt);
  } else if (borAmt > 0) {
    return stellarBorrow(input.borrowSym ?? input.depositSym, borAmt);
  }

  throw new Error("Must provide positive depositAmount or borrowAmount");
}

/**
 * Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.getBorrowedTokenDebtWad
 */
export async function getBorrowedTokenDebtWad(marginAccountAddress: string, tokenSymbol: string): Promise<bigint> {
  const norm = normalizeContractTokenSymbol(tokenSymbol);
  try {
    const raw = await readContract(marginAccountAddress, "get_borrowed_token_debt", nativeToScVal(norm, { type: "symbol" }));
    return BigInt(raw?.toString?.() ?? "0");
  } catch {
    return 0n;
  }
}

/**
 * Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.getMarginAccountTokenBalanceWad
 */
export async function getMarginAccountTokenBalanceWad(marginAccountAddress: string, tokenSymbol: string): Promise<bigint> {
  const norm = normalizeContractTokenSymbol(tokenSymbol);
  const tokenIdBySymbol: Record<string, string> = {
    XLM: EARN_POOLS.XLM.token,
    USDC: EARN_POOLS.BLUSDC.token,
    AQUSDC: EARN_POOLS.AqUSDC.token,
    SOUSDC: EARN_POOLS.SoUSDC.token,
  };
  const tokenId = tokenIdBySymbol[norm];
  if (!tokenId) return 0n;
  try {
    const stroopsRaw = await readContract(tokenId, "balance", nativeToScVal(marginAccountAddress, { type: "address" }));
    const stroops = BigInt(stroopsRaw?.toString?.() ?? "0");
    return stroops * 100_000_000_000n; // 1e7 -> 1e18 WAD
  } catch {
    return 0n;
  }
}

/**
 * f) Repay borrowed debt from margin account.
 * Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.repayLoan and apps/stellar/components/margin/mg-repay.tsx:mutationFn
 */
export async function stellarRepay(sym: string, amount: number, isFullRepay?: boolean): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const marginAddr = await findMarginAccount(wallet.full);
  if (!marginAddr) {
    throw new Error("No margin account found for this wallet");
  }
  const contractTokenSymbol = normalizeContractTokenSymbol(sym);

  const [debtWad, marginBalWad] = await Promise.all([
    getBorrowedTokenDebtWad(marginAddr, contractTokenSymbol),
    getMarginAccountTokenBalanceWad(marginAddr, contractTokenSymbol),
  ]);

  const inputRepayWad = numberAmountToWad(amount);
  const cappedToDebt = debtWad > 0n ? (inputRepayWad > debtWad ? debtWad : inputRepayWad) : inputRepayWad;

  // Accrued interest protection for 100% full repay (1% buffer, floored at 0.01 token in WAD)
  const REPAY_BUFFER_BPS = 100n;
  const REPAY_BUFFER_FLOOR_WAD = 10_000_000_000_000_000n; // 0.01 token in WAD
  const proportional = (debtWad * REPAY_BUFFER_BPS) / 10_000n;
  const buffer = proportional > REPAY_BUFFER_FLOOR_WAD ? proportional : REPAY_BUFFER_FLOOR_WAD;
  const bufferedDebtWad = debtWad > 0n ? debtWad + buffer : debtWad;

  const finalRepayWad =
    isFullRepay && debtWad > 0n && marginBalWad > 0n
      ? bufferedDebtWad > marginBalWad
        ? marginBalWad
        : bufferedDebtWad
      : marginBalWad > 0n && cappedToDebt > marginBalWad
        ? marginBalWad
        : cappedToDebt;

  if (finalRepayWad <= 0n) {
    throw new Error("Nothing to repay for this token (no debt or insufficient margin account balance)");
  }

  return submitContract(
    wallet.full,
    CONTRACTS.ACCOUNT_MANAGER,
    "repay",
    [
      nativeToScVal(finalRepayWad.toString(), { type: "u256" }),
      nativeToScVal(contractTokenSymbol, { type: "symbol" }),
      nativeToScVal(marginAddr, { type: "address" }),
    ],
    { feeMultiplier: 50 },
  );
}

/**
 * g) Flash repay: swap collateral inside margin account then repay debt.
 * Ported from: apps/stellar/lib/soroswap-utils.ts:SoroswapService.swapFromMargin and apps/stellar/lib/margin-utils.ts:MarginAccountService.repayLoan
 */
export async function stellarFlashRepay(sym: string, debtAmount: number, collSym?: string): Promise<string> {
  const normDebtSym = normalizeContractTokenSymbol(sym);
  const normCollSym = collSym ? normalizeContractTokenSymbol(collSym) : undefined;

  if (normCollSym && normCollSym !== normDebtSym) {
    await stellarSpotSwap({
      fromSym: normCollSym,
      toSym: normDebtSym,
      amountIn: debtAmount,
      venue: "Soroswap",
      fromMargin: true,
    });
  }

  return stellarRepay(sym, debtAmount, true);
}

/**
 * h) Spot swap via Soroswap or Aquarius (direct from wallet or via margin account).
 * Ported from: apps/stellar/lib/soroswap-utils.ts:SoroswapService.swap / swapFromMargin and apps/stellar/lib/aquarius-utils.ts:AquariusService.aquariusSwap / aquariusSwapFromMargin
 */
export async function stellarSpotSwap(input: {
  fromSym: string;
  toSym: string;
  amountIn: number;
  venue?: "Soroswap" | "Aquarius";
  fromMargin?: boolean;
  slippagePct?: number;
}): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const venue = input.venue ?? "Soroswap";

  if (input.fromMargin) {
    const marginAddr = await findMarginAccount(wallet.full);
    if (!marginAddr) throw new Error("Margin account required for margin swap");

    const amountStroops = BigInt(Math.floor(input.amountIn * 1e7));
    if (amountStroops <= 0n) throw new Error("Invalid swap amount");

    const routerAddress = venue === "Soroswap" ? SOROSWAP_ROUTER : AQUARIUS_ROUTER;
    const callBytes = buildExternalProtocolCallBytes(
      routerAddress,
      "Swap",
      [normalizeContractTokenSymbol(input.fromSym), normalizeContractTokenSymbol(input.toSym)], // on-chain symbols, e.g. SOUSDC not SoUSDC
      [amountStroops * 100_000_000_000n, 0n],
      marginAddr,
      venue,
      false,
      30,
    );

    return submitContract(
      wallet.full,
      CONTRACTS.ACCOUNT_MANAGER,
      "execute",
      [nativeToScVal(marginAddr, { type: "address" }), xdr.ScVal.scvBytes(callBytes)],
      { feeMultiplier: 100 },
    );
  }

  // Direct wallet swap
  if (venue === "Soroswap") {
    const tokenInContract = EARN_POOLS[input.fromSym]?.token ?? (input.fromSym === "XLM" ? EARN_POOLS.XLM.token : EARN_POOLS.BLUSDC.token);
    const tokenOutContract = EARN_POOLS[input.toSym]?.token ?? (input.toSym === "XLM" ? EARN_POOLS.XLM.token : EARN_POOLS.BLUSDC.token);
    const amountInStroops = BigInt(Math.floor(input.amountIn * 1e7));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
    const pathVec = xdr.ScVal.scvVec([
      nativeToScVal(tokenInContract, { type: "address" }),
      nativeToScVal(tokenOutContract, { type: "address" }),
    ]);

    return submitContract(
      wallet.full,
      SOROSWAP_ROUTER,
      "swap_exact_tokens_for_tokens",
      [
        nativeToScVal(amountInStroops.toString(), { type: "i128" }),
        nativeToScVal("1", { type: "i128" }), // minOut (slippage-bounded)
        pathVec,
        nativeToScVal(wallet.full, { type: "address" }),
        nativeToScVal(deadline.toString(), { type: "u64" }),
      ],
      { feeMultiplier: 100 },
    );
  } else {
    // Aquarius direct swap
    const tokenInContract = EARN_POOLS[input.fromSym]?.token ?? EARN_POOLS.XLM.token;
    const tokenOutContract = EARN_POOLS[input.toSym]?.token ?? EARN_POOLS.AqUSDC.token;
    const sortedTokens = tokenInContract <= tokenOutContract ? [tokenInContract, tokenOutContract] : [tokenOutContract, tokenInContract];
    const amountInStroops = BigInt(Math.floor(input.amountIn * 1e7));
    const idxBytes = Buffer.from(AQUARIUS_POOL_INDEX_HEX, "hex");

    const hop = xdr.ScVal.scvVec([
      xdr.ScVal.scvVec(sortedTokens.map((a) => nativeToScVal(a, { type: "address" }))),
      xdr.ScVal.scvBytes(idxBytes),
      nativeToScVal(tokenOutContract, { type: "address" }),
    ]);
    const swapsChain = xdr.ScVal.scvVec([hop]);

    return submitContract(
      wallet.full,
      AQUARIUS_ROUTER,
      "swap_chained",
      [
        nativeToScVal(wallet.full, { type: "address" }),
        swapsChain,
        nativeToScVal(tokenInContract, { type: "address" }),
        nativeToScVal(amountInStroops.toString(), { type: "u128" }),
        nativeToScVal("1", { type: "u128" }),
      ],
      { feeMultiplier: 100 },
    );
  }
}

/**
 * i) Farm action: Blend lending or Soroswap / Aquarius LP via margin account.
 * Ported from: apps/stellar/lib/blend-utils.ts:BlendService.depositToBlendPool / withdrawFromBlendPool, apps/stellar/lib/soroswap-utils.ts:SoroswapService.addLiquidity / removeLiquidity, and apps/stellar/lib/aquarius-utils.ts:AquariusService.addLiquidity / removeLiquidity
 */
// The amount typed for an LP farm is the USDC side; the XLM side comes from the pool's live ratio (web pool-action.tsx).
async function lpDepositAmounts(row: "SS_XLM_USDC" | "AQ_XLM_USDC", owner: string, usdc: number): Promise<{ xlm: number; usdc: number }> {
  const [r, account] = await Promise.all([lpReserves(row), fetchStellarAccount(owner)]);
  if (!(r.xlm > 0) || !(r.usdc > 0)) throw new Error("This pool has no liquidity yet");
  const xlm = Math.ceil((usdc * r.xlm * 1e7) / r.usdc) / 1e7;
  const held = account.margin?.collateral.XLM?.amount ?? 0;
  if (held < xlm) throw new Error(`This deposit also needs ${xlm.toFixed(2)} XLM in your margin account (you have ${held.toFixed(2)})`);
  return { xlm, usdc };
}

// The amount typed to withdraw is a dollar value (that is how the position is shown), so convert it to LP shares.
async function lpSharesForUsd(row: "SS_XLM_USDC" | "AQ_XLM_USDC", owner: string, usd: number): Promise<number> {
  const position = (await fetchStellarAccount(owner)).margin?.collateral[row];
  if (!position || !(position.amount > 0)) throw new Error("No position in this pool");
  return usd >= position.usd * 0.9999 ? position.amount : (position.amount * usd) / position.usd;
}

export async function stellarFarmAction(input: {
  id: string;
  mode: "supply" | "withdraw";
  amount: number;
}): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const marginAddr = await findMarginAccount(wallet.full);
  if (!marginAddr) {
    throw new Error("Margin account required for farm actions. Deposit collateral first.");
  }

  if (input.id.includes("blend")) {
    const tokenSymbol = input.id.includes("xlm") ? "XLM" : "USDC";
    const amountWad = numberAmountToWad(input.amount);
    const action = input.mode === "supply" ? "Deposit" : "Withdraw";
    const callBytes = buildExternalProtocolCallBytes(
      BLEND_POOL,
      action,
      [tokenSymbol],
      [amountWad],
      marginAddr,
      "Blend",
      false,
      0,
    );

    return submitContract(
      wallet.full,
      CONTRACTS.ACCOUNT_MANAGER,
      "execute",
      [nativeToScVal(marginAddr, { type: "address" }), xdr.ScVal.scvBytes(callBytes)],
      { feeMultiplier: 20 },
    );
  }

  if (input.id.includes("soroswap")) {
    if (input.mode === "supply") {
      const { xlm: amtA, usdc: amtB } = await lpDepositAmounts("SS_XLM_USDC", wallet.full, input.amount);
      const callBytes = buildExternalProtocolCallBytes(
        SOROSWAP_ROUTER,
        "AddLiquidity",
        ["XLM", "SOUSDC"],
        [numberAmountToWad(amtA), numberAmountToWad(amtB)],
        marginAddr,
        "Soroswap",
        true,
        30,
      );

      return submitContract(
        wallet.full,
        CONTRACTS.ACCOUNT_MANAGER,
        "execute",
        [nativeToScVal(marginAddr, { type: "address" }), xdr.ScVal.scvBytes(callBytes)],
        { feeMultiplier: 100 },
      );
    } else {
      const lpUnits = BigInt(Math.round((await lpSharesForUsd("SS_XLM_USDC", wallet.full, input.amount)) * 1e7));
      const callBytes = buildExternalProtocolCallBytes(
        SOROSWAP_ROUTER,
        "RemoveLiquidity",
        ["XLM", "SOUSDC"],
        [lpUnits],
        marginAddr,
        "Soroswap",
        true,
        30,
      );

      return submitContract(
        wallet.full,
        CONTRACTS.ACCOUNT_MANAGER,
        "execute",
        [nativeToScVal(marginAddr, { type: "address" }), xdr.ScVal.scvBytes(callBytes)],
        { feeMultiplier: 50 },
      );
    }
  }

  if (input.id.includes("aquarius")) {
    if (input.mode === "supply") {
      const { xlm: amtA, usdc: amtB } = await lpDepositAmounts("AQ_XLM_USDC", wallet.full, input.amount);
      const callBytes = buildExternalProtocolCallBytes(
        AQUARIUS_ROUTER,
        "AddLiquidity",
        ["XLM", "AQUSDC"],
        [numberAmountToWad(amtA), numberAmountToWad(amtB)],
        marginAddr,
        "Aquarius",
        true,
        30,
      );

      return submitContract(
        wallet.full,
        CONTRACTS.ACCOUNT_MANAGER,
        "execute",
        [nativeToScVal(marginAddr, { type: "address" }), xdr.ScVal.scvBytes(callBytes)],
        { feeMultiplier: 100 },
      );
    } else {
      const callBytes = buildExternalProtocolCallBytes(
        AQUARIUS_ROUTER,
        "RemoveLiquidity",
        ["XLM", "AQUSDC"],
        [numberAmountToWad(await lpSharesForUsd("AQ_XLM_USDC", wallet.full, input.amount))],
        marginAddr,
        "Aquarius",
        true,
        30,
      );

      return submitContract(
        wallet.full,
        CONTRACTS.ACCOUNT_MANAGER,
        "execute",
        [nativeToScVal(marginAddr, { type: "address" }), xdr.ScVal.scvBytes(callBytes)],
        { feeMultiplier: 50 },
      );
    }
  }

  throw new Error(`Unsupported farm vault: ${input.id}`);
}

/**
 * j) Transfer tokens: Wallet <-> Margin or external transfer.
 * Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.depositCollateralTokens / withdrawCollateralBalance and SEP-41 Soroban token transfer
 */
export async function stellarTransfer(input: {
  sym: string;
  amount: number;
  from: string;
  to: string;
}): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const marginAddr = await findMarginAccount(wallet.full);

  // Transfer from wallet into own margin account -> deposit collateral
  if (input.from === wallet.full && marginAddr && input.to === marginAddr) {
    return stellarDepositCollateral(input.sym, input.amount);
  }

  // Transfer from margin account to wallet -> withdraw collateral
  if (marginAddr && input.from === marginAddr && input.to === wallet.full) {
    return stellarWithdrawCollateral(input.sym, input.amount);
  }

  // External token transfer from active wallet
  const tokenContract = EARN_POOLS[input.sym]?.token ?? (input.sym === "XLM" ? EARN_POOLS.XLM.token : EARN_POOLS.BLUSDC.token);
  const amountStroops = BigInt(Math.floor(input.amount * 1e7));

  return submitContract(
    wallet.full,
    tokenContract,
    "transfer",
    [
      nativeToScVal(input.from, { type: "address" }),
      nativeToScVal(input.to, { type: "address" }),
      nativeToScVal(amountStroops.toString(), { type: "i128" }),
    ],
    { feeMultiplier: 1 },
  );
}

/**
 * k) Mint test funds from Stellar testnet faucets (XLM, Blend USDC, Soroswap USDC, Aquarius USDC).
 * Ported from: apps/stellar/lib/faucet-utils.ts:fundXlmViaFriendbot, fundBlendAssets, fundSoroswapUsdc, fundAquariusClassicAsset
 */
export async function stellarFaucet(sym?: string): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const address = wallet.full;
  const s = sym?.toUpperCase();

  // 1. XLM via Friendbot
  if (!s || s === "XLM") {
    const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`);
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as { hash?: string };
      return body.hash || "friendbot_funded";
    }
    const errText = await res.text().catch(() => "");
    if (errText.includes("op_already_exists") || errText.includes("createAccountAlreadyExist") || errText.includes("already funded")) {
      return "already_funded";
    }
    throw new Error(`Friendbot funding failed: ${errText.slice(0, 160)}`);
  }

  // 2. Blend USDC (testnet basket: USDC, BLND, trustlines)
  if (s === "BLUSDC" || s === "BLEND_USDC" || s === "USDC") {
    const res = await fetch(`${BLEND_FAUCET_URL}?userId=${encodeURIComponent(address)}`);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Blend faucet failed (${res.status}): ${errText.slice(0, 160)}`);
    }
    const xdrBase64 = (await res.text()).replace(/^"|"$/g, "");
    if (!xdrBase64) return "already_funded";

    const tx = TransactionBuilder.fromXDR(xdrBase64, NETWORK_PASSPHRASE);
    if (tx.operations.length === 0) return "already_funded";

    const signedXdr = await signStellar(tx.toXDR());
    const isSoroban = tx.operations.some((op) => op.type === "invokeHostFunction");

    if (isSoroban) {
      const sent = await rpc<{ status?: string; hash?: string }>("sendTransaction", { transaction: signedXdr });
      return sent.hash || "blend_funded";
    } else {
      const hRes = await fetch("https://horizon-testnet.stellar.org/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ tx: signedXdr }).toString(),
      });
      const hBody = (await hRes.json().catch(() => ({}))) as { hash?: string; detail?: string };
      if (!hRes.ok && !hBody.hash) {
        if (JSON.stringify(hBody).includes("tx_missing_operation") || JSON.stringify(hBody).includes("op_already_exists")) {
          return "already_funded";
        }
        throw new Error(hBody.detail || "Blend faucet submission failed");
      }
      return hBody.hash || "blend_funded";
    }
  }

  // 3. Soroswap USDC via Soroswap Faucet API
  if (s === "SOUSDC" || s === "SOROSWAP_USDC") {
    const res = await fetch(
      `${SOROSWAP_FAUCET_URL}?address=${encodeURIComponent(address)}&contract=${encodeURIComponent(EARN_POOLS.SoUSDC.token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    const body = (await res.json().catch(() => null)) as { status?: string; txHash?: string; message?: string } | null;
    if (res.ok && body?.status === "SUCCESS") {
      return body.txHash || "soroswap_funded";
    }
    throw new Error(body?.message || `Soroswap faucet returned ${res.status}`);
  }

  // 4. Aquarius USDC via distribution keypair payment
  if (s === "AQUSDC" || s === "AQUARIUS_USDC") {
    const faucetKeypair = Keypair.fromSecret(AQUARIUS_FAUCET_SECRET);
    const asset = new Asset(AQUARIUS_USDC_CODE, AQUARIUS_USDC_ISSUER);
    const userAcc = await sourceAccount(address);

    // Check if user already has the classic asset trustline
    const accRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
    const accData = (await accRes.json().catch(() => ({}))) as { balances?: { asset_code?: string; asset_issuer?: string }[] };
    const hasTrustline = (accData.balances ?? []).some(
      (b) => b.asset_code === AQUARIUS_USDC_CODE && b.asset_issuer === AQUARIUS_USDC_ISSUER,
    );

    const txBuilder = new TransactionBuilder(userAcc, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE }).setTimeout(120);

    if (!hasTrustline) {
      txBuilder.addOperation(Operation.changeTrust({ asset }));
    }
    txBuilder.addOperation(
      Operation.payment({
        source: faucetKeypair.publicKey(),
        destination: address,
        asset,
        amount: "1000.0000000",
      }),
    );

    const builtTx = txBuilder.build();
    builtTx.sign(faucetKeypair);

    const userSigned = await signStellar(builtTx.toXDR());
    const hRes = await fetch("https://horizon-testnet.stellar.org/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ tx: userSigned }).toString(),
    });
    const hBody = (await hRes.json().catch(() => ({}))) as { hash?: string; detail?: string; title?: string };
    if (!hRes.ok && !hBody.hash) {
      throw new Error(hBody.detail || hBody.title || `Aquarius faucet submission failed (${hRes.status})`);
    }
    return hBody.hash || "aquarius_funded";
  }

  throw new Error(`Unsupported faucet token: ${sym}`);
}
