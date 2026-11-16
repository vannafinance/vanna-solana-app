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
import { CONTRACTS, EARN_POOLS, NETWORK_PASSPHRASE, VENUES } from "./config";
import { readContract } from "./read";
import { rpc, sourceAccount, submitContract } from "./submit";

// Venue constants (testnet): Blend pool and the two DEX routers the credit layer's validators allow.
// Ported from: apps/stellar/lib/stellar-utils.ts:CONTRACT_ADDRESSES
const BLEND_POOL = VENUES.BLEND_POOL;
const SOROSWAP_ROUTER = VENUES.SOROSWAP_ROUTER;
const AQUARIUS_ROUTER = VENUES.AQUARIUS_ROUTER;
const AQUARIUS_POOL_INDEX_HEX = VENUES.AQUARIUS_POOL_INDEX_HEX;

// The four credit assets: XLM and one USDC test token per venue (Blend BLUSDC, Aquarius AQUSDC, Soroswap SOUSDC).
const TOKEN_OF: Record<string, string> = {
  XLM: EARN_POOLS.XLM.token,
  BLUSDC: EARN_POOLS.BLUSDC.token,
  AQUSDC: EARN_POOLS.AqUSDC.token,
  SOUSDC: EARN_POOLS.SoUSDC.token,
};
const RESERVE_OF: Record<string, string> = {
  XLM: EARN_POOLS.XLM.pool,
  BLUSDC: EARN_POOLS.BLUSDC.pool,
  AQUSDC: EARN_POOLS.AqUSDC.pool,
  SOUSDC: EARN_POOLS.SoUSDC.pool,
};

// Faucet constants
// Ported from: apps/stellar/lib/faucet-utils.ts
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const BLEND_FAUCET_URL = "https://ewqw4hx7oa.execute-api.us-east-1.amazonaws.com/getAssets";
const SOROSWAP_FAUCET_URL = "https://api.soroswap.finance/api/faucet";
// The Aquarius test USDC is issued by this key, so it signs the faucet payment. It is NOT stored in the code: it comes from the build's
// environment (.env, git-ignored). EXPO_PUBLIC_ values are bundled into the app, so use this only for testnet builds, and prefer a
// server route that does the signing.
const AQUARIUS_FAUCET_SECRET = process.env.EXPO_PUBLIC_AQUARIUS_FAUCET_SECRET ?? "";
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

// Rounds DOWN through a 7-decimal integer step (web blend-utils humanToWad / soroswap floorAmountToStroops), so a "max" amount never
// overshoots the real balance by a rounding unit.
const stroops = (n: number): bigint => (Number.isFinite(n) && n > 0 ? BigInt(Math.floor(n * 1e7 + 1e-6)) : 0n);
const wadFloor = (n: number): bigint => stroops(n) * 10n ** 11n;

// UI / contract symbol -> credit asset key: XLM, BLUSDC (plain "USDC" means Blend USDC), AQUSDC, SOUSDC.
// Ported from: apps/stellar/lib/credit-layer.ts:toCreditAsset
export function normalizeContractTokenSymbol(tokenSymbol: string): string {
  const s = String(tokenSymbol || "").trim().toUpperCase().replace(/[\s-]/g, "_");
  if (s === "XLM" || s === "NATIVE") return "XLM";
  if (["USDC", "BLUSDC", "BLEND_USDC", "BLENDUSDC"].includes(s)) return "BLUSDC";
  if (["AQUSDC", "AQUARIUS_USDC", "AQUARIUSUSDC", "AQUIRESUSDC"].includes(s)) return "AQUSDC";
  if (["SOUSDC", "SOROSWAP_USDC", "SOROSWAPUSDC"].includes(s)) return "SOUSDC";
  return s;
}

const tokenFor = (sym: string): string => {
  const t = TOKEN_OF[normalizeContractTokenSymbol(sym)];
  if (!t) throw new Error(`Unsupported asset: ${sym}`);
  return t;
};
const reserveFor = (sym: string): string => {
  const r = RESERVE_OF[normalizeContractTokenSymbol(sym)];
  if (!r) throw new Error(`Unsupported asset: ${sym}`);
  return r;
};

const addr = (a: string) => nativeToScVal(a, { type: "address" });
const u256 = (v: bigint | string) => nativeToScVal(BigInt(v), { type: "u256" });
const u128 = (v: bigint | string | number) => nativeToScVal(BigInt(v), { type: "u128" });

type VenueAction = "Supply" | "Withdraw" | "Swap" | "AddLiquidity" | "RemoveLiquidity";

// CreditLayer.margin_execute(margin, target, action, tokens, amounts, min_out): every venue call goes through here and the credit
// layer's validators turn it into the venue's own call. Ported from: apps/stellar/lib/credit-layer.ts:CreditLayer.execute
// Amounts are WAD except where noted per action (Soroswap LP and all mins are native 7-decimal units; Aquarius LP is WAD).
async function marginExecute(
  owner: string,
  margin: string,
  target: string,
  action: VenueAction,
  tokens: string[],
  amounts: (bigint | number)[],
  minOut: bigint | number = 0n,
  feeMultiplier = 100,
): Promise<string> {
  return submitContract(
    owner,
    CONTRACTS.CREDIT_LAYER,
    "margin_execute",
    [
      addr(margin),
      addr(target),
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(action)]),
      xdr.ScVal.scvVec(tokens.map(addr)),
      xdr.ScVal.scvVec(amounts.map((a) => u128(a))),
      u128(minOut),
    ],
    { feeMultiplier },
  );
}

/**
 * a) Ensure the trader has a margin account.
 * Ported from: apps/stellar/lib/credit-layer.ts:CreditLayer.createMargin (CreditLayer.create_margin(trader))
 */
export async function ensureStellarMarginAccount(owner?: string): Promise<{ address: string; hash?: string }> {
  const user = owner ?? requireActiveRealWallet("stellar").full;
  const existing = await findMarginAccount(user);
  if (existing) {
    return { address: existing };
  }

  const hash = await submitContract(user, CONTRACTS.CREDIT_LAYER, "create_margin", [addr(user)], { feeMultiplier: 20 });

  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const created = await findMarginAccount(user);
    if (created) {
      return { address: created, hash };
    }
  }

  throw new Error("Margin account created on-chain but could not be found with margin_of");
}

/**
 * b) Deposit collateral into the margin account.
 * Ported from: apps/stellar/lib/credit-layer.ts:CreditLayer.depositCollateral (deposit_collateral(margin, token, amount WAD))
 */
export async function stellarDepositCollateral(sym: string, amount: number): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const { address: marginAddr } = await ensureStellarMarginAccount(wallet.full);
  const amountWad = wadFloor(amount);
  if (amountWad <= 0n) throw new Error("Enter a valid amount");

  return submitContract(
    wallet.full,
    CONTRACTS.CREDIT_LAYER,
    "deposit_collateral",
    [addr(marginAddr), addr(tokenFor(sym)), u256(amountWad)],
    { feeMultiplier: 20 },
  );
}

/**
 * c) Withdraw collateral from the margin account back to the wallet.
 * Ported from: apps/stellar/lib/credit-layer.ts:CreditLayer.withdrawCollateral
 */
export async function stellarWithdrawCollateral(sym: string, amount: number): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const marginAddr = await findMarginAccount(wallet.full);
  if (!marginAddr) {
    throw new Error("No margin account found for this wallet. Create one or deposit collateral first.");
  }
  const amountWad = wadFloor(amount);
  if (amountWad <= 0n) throw new Error("Enter a valid amount");

  return submitContract(
    wallet.full,
    CONTRACTS.CREDIT_LAYER,
    "withdraw_collateral",
    [addr(marginAddr), addr(tokenFor(sym)), u256(amountWad)],
    { feeMultiplier: 50 },
  );
}

/**
 * d) Borrow tokens against margin account collateral.
 * Ported from: apps/stellar/lib/credit-layer.ts:CreditLayer.borrow (borrow(margin, token, amount WAD))
 */
export async function stellarBorrow(sym: string, amount: number): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const marginAddr = await findMarginAccount(wallet.full);
  if (!marginAddr) {
    throw new Error("No margin account found. Create a margin account and deposit collateral before borrowing.");
  }
  const borrowWad = wadFloor(amount);
  if (borrowWad <= 0n) throw new Error("Enter a valid amount");

  return submitContract(
    wallet.full,
    CONTRACTS.CREDIT_LAYER,
    "borrow",
    [addr(marginAddr), addr(tokenFor(sym)), u256(borrowWad)],
    { feeMultiplier: 50 },
  );
}

/**
 * e) Deposit collateral and borrow. The credit layer has no combined call, so this is deposit then borrow (as the web does).
 * Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.depositAndBorrow and apps/stellar/components/margin/mg-leverage.tsx
 */
export async function stellarDepositAndBorrow(input: {
  depositSym: string;
  depositAmount: number;
  borrowSym?: string;
  borrowAmount?: number;
  multiplier?: number;
}): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  await ensureStellarMarginAccount(wallet.full);

  const depAmt = input.depositAmount;
  const borAmt = input.borrowAmount ?? (input.multiplier && input.multiplier > 1 ? depAmt * (input.multiplier - 1) : 0);

  if (depAmt > 0 && borAmt > 0) {
    await stellarDepositCollateral(input.depositSym, depAmt);
    return await stellarBorrow(input.borrowSym ?? input.depositSym, borAmt);
  } else if (depAmt > 0) {
    return stellarDepositCollateral(input.depositSym, depAmt);
  } else if (borAmt > 0) {
    return stellarBorrow(input.borrowSym ?? input.depositSym, borAmt);
  }

  throw new Error("Must provide positive depositAmount or borrowAmount");
}

/**
 * Debt in one reserve, WAD: reserve.debt_of(margin).
 * Ported from: apps/stellar/lib/credit-layer.ts:debtOf
 */
export async function getBorrowedTokenDebtWad(marginAccountAddress: string, tokenSymbol: string): Promise<bigint> {
  try {
    const raw = await readContract(reserveFor(tokenSymbol), "debt_of", addr(marginAccountAddress));
    return BigInt(raw?.toString?.() ?? "0");
  } catch {
    return 0n;
  }
}

/**
 * Ported from: apps/stellar/lib/margin-utils.ts:MarginAccountService.getMarginAccountTokenBalanceWad
 */
export async function getMarginAccountTokenBalanceWad(marginAccountAddress: string, tokenSymbol: string): Promise<bigint> {
  const tokenId = TOKEN_OF[normalizeContractTokenSymbol(tokenSymbol)];
  if (!tokenId) return 0n;
  try {
    const stroopsRaw = await readContract(tokenId, "balance", addr(marginAccountAddress));
    const s = BigInt(stroopsRaw?.toString?.() ?? "0");
    return s * 100_000_000_000n; // 1e7 -> 1e18 WAD
  } catch {
    return 0n;
  }
}

/**
 * f) Repay borrowed debt from the margin account's own balance of the token.
 * Ported from: apps/stellar/lib/credit-layer.ts:CreditLayer.repay (repay(margin, token, amount WAD); the contract caps it at the debt)
 */
export async function stellarRepay(sym: string, amount: number, isFullRepay?: boolean): Promise<string> {
  const wallet = requireActiveRealWallet("stellar");
  const marginAddr = await findMarginAccount(wallet.full);
  if (!marginAddr) {
    throw new Error("No margin account found for this wallet");
  }

  const [debtWad, marginBalWad] = await Promise.all([
    getBorrowedTokenDebtWad(marginAddr, sym),
    getMarginAccountTokenBalanceWad(marginAddr, sym),
  ]);

  const inputRepayWad = wadFloor(amount);
  const cappedToDebt = debtWad > 0n ? (inputRepayWad > debtWad ? debtWad : inputRepayWad) : inputRepayWad;

  // Accrued interest protection for 100% full repay (1% buffer, floored at 0.01 token in WAD). The contract caps at the debt.
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
    CONTRACTS.CREDIT_LAYER,
    "repay",
    [addr(marginAddr), addr(tokenFor(sym)), u256(finalRepayWad)],
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
 * Ported from: apps/stellar/lib/soroswap-utils.ts:SoroswapService.buildSwapArgs / swap and apps/stellar/lib/aquarius-utils.ts:AquariusService.buildSwapArgs / aquariusSwap
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

    const amountWad = wadFloor(input.amountIn);
    if (amountWad <= 0n) throw new Error("Invalid swap amount");

    // Each venue swaps its own USDC test token: Soroswap SOUSDC, Aquarius AQUSDC (XLM <-> AqUSDC only).
    const venueUsdc = venue === "Soroswap" ? "SOUSDC" : "AQUSDC";
    const side = (s: string) => {
      const n = normalizeContractTokenSymbol(s);
      return n === "XLM" ? "XLM" : venueUsdc;
    };
    if (venue === "Aquarius" && ![input.fromSym, input.toSym].some((s) => normalizeContractTokenSymbol(s) === "XLM")) {
      throw new Error("Margin swaps on Aquarius are only available for XLM <-> AqUSDC.");
    }

    return marginExecute(
      wallet.full,
      marginAddr,
      venue === "Soroswap" ? SOROSWAP_ROUTER : AQUARIUS_ROUTER,
      "Swap",
      [tokenFor(side(input.fromSym)), tokenFor(side(input.toSym))],
      [amountWad],
      0n,
      100,
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
 * i) Farm action: Blend lending or Soroswap / Aquarius LP via the margin account.
 * Ported from: apps/stellar/lib/blend-utils.ts:BlendService.buildExecuteArgs, apps/stellar/lib/soroswap-utils.ts:SoroswapService.buildAddLiquidityArgs / buildRemoveLiquidityArgs,
 * and apps/stellar/lib/aquarius-utils.ts:AquariusService.buildAddLiquidityArgs / buildRemoveLiquidityArgs
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
  // The typed / Max amount is rounded down to cents, so anything within a cent or so of the whole position removes all of it
  // (otherwise Max leaves a sliver of LP shares behind).
  return usd >= position.usd - 0.011 ? position.amount : (position.amount * usd) / position.usd;
}

export async function stellarFarmAction(input: { id: string; mode: "supply" | "withdraw"; amount: number }): Promise<string> {
  try {
    return await stellarFarmActionInner(input);
  } catch (e) {
    console.warn("[farm] failed", String((e as Error)?.message).slice(0, 160), String((e as Error)?.stack).slice(0, 1200));
    throw e;
  }
}

async function stellarFarmActionInner(input: {
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
    // Blend: tokens=[token], amounts=[amount WAD], min_out unused.
    const token = input.id.includes("xlm") ? TOKEN_OF.XLM : TOKEN_OF.BLUSDC;
    const amountWad = wadFloor(input.amount);
    if (amountWad <= 0n) throw new Error("Amount must be greater than zero");
    return marginExecute(wallet.full, marginAddr, BLEND_POOL, input.mode === "supply" ? "Supply" : "Withdraw", [token], [amountWad], 0n, 20);
  }

  if (input.id.includes("soroswap")) {
    const tokens = [TOKEN_OF.XLM, TOKEN_OF.SOUSDC];
    if (input.mode === "supply") {
      // tokens=[a, b], amounts=[a WAD, b WAD, min_a native, min_b native]; the validator sizes the deposit to the pool ratio.
      const { xlm, usdc } = await lpDepositAmounts("SS_XLM_USDC", wallet.full, input.amount);
      return marginExecute(wallet.full, marginAddr, SOROSWAP_ROUTER, "AddLiquidity", tokens, [wadFloor(xlm), wadFloor(usdc), 0n, 0n], 0n, 100);
    }
    // RemoveLiquidity: amounts=[lp NATIVE, min_a native, min_b native]
    const lpUnits = stroops(await lpSharesForUsd("SS_XLM_USDC", wallet.full, input.amount));
    return marginExecute(wallet.full, marginAddr, SOROSWAP_ROUTER, "RemoveLiquidity", tokens, [lpUnits, 0n, 0n], 0n, 50);
  }

  if (input.id.includes("aquarius")) {
    const tokens = [TOKEN_OF.XLM, TOKEN_OF.AQUSDC];
    if (input.mode === "supply") {
      // tokens=[a, b], amounts=[a WAD, b WAD], min_out = min shares (native) = 0
      const { xlm, usdc } = await lpDepositAmounts("AQ_XLM_USDC", wallet.full, input.amount);
      return marginExecute(wallet.full, marginAddr, AQUARIUS_ROUTER, "AddLiquidity", tokens, [wadFloor(xlm), wadFloor(usdc)], 0n, 100);
    }
    // RemoveLiquidity: amounts=[lp WAD, min_a native, min_b native] (Aquarius LP is WAD, unlike Soroswap)
    const lpWad = wadFloor(await lpSharesForUsd("AQ_XLM_USDC", wallet.full, input.amount));
    return marginExecute(wallet.full, marginAddr, AQUARIUS_ROUTER, "RemoveLiquidity", tokens, [lpWad, 0n, 0n], 0n, 50);
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
  /** Text memo for an external send (exchanges ask for one). */
  memo?: string;
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
    { feeMultiplier: 1, memo: input.memo },
  );
}

/**
 * k) Mint test funds from Stellar testnet faucets (XLM, Blend USDC, Soroswap USDC, Aquarius USDC).
 * Ported from: apps/stellar/lib/faucet-utils.ts:fundXlmViaFriendbot, fundBlendAssets, fundSoroswapUsdc, fundAquariusClassicAsset
 */
// Which network a wallet signed a transaction for: the signature covers the network passphrase, so the wrong one is "bad auth".
function signedFor(xdr: string, address: string): string {
  try {
    const kp = Keypair.fromPublicKey(address);
    const nets: [string, string][] = [["Testnet", NETWORK_PASSPHRASE], ["Mainnet", "Public Global Stellar Network ; September 2015"]];
    for (const [name, pass] of nets) {
      const t = TransactionBuilder.fromXDR(xdr, pass);
      if (t.signatures.some((sg) => sg.hint().equals(kp.signatureHint()) && kp.verify(t.hash(), sg.signature()))) return name;
    }
  } catch {}
  return "neither";
}

// Horizon's `detail` is generic ("The transaction failed when submitted..."); the real reason is in extras.result_codes.
function horizonReason(b: any, fallback: string): string {
  const rc = b?.extras?.result_codes;
  if (rc) return `${rc.transaction ?? "failed"}${rc.operations?.length ? ` (${rc.operations.join(", ")})` : ""}`;
  return b?.detail || b?.title || fallback;
}

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
      const sent = await rpc<{ status?: string; hash?: string; errorResultXdr?: string }>("sendTransaction", { transaction: signedXdr });
      if (sent.status === "ERROR") throw new Error(`Blend USDC: network rejected it${sent.errorResultXdr ? ` (${sent.errorResultXdr.slice(0, 40)})` : ""}`);
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
        throw new Error(`Blend USDC: ${horizonReason(hBody, "submission failed")}`);
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
    if (!AQUARIUS_FAUCET_SECRET) throw new Error("The Aquarius test faucet isn't set up in this build.");
    const faucetKeypair = Keypair.fromSecret(AQUARIUS_FAUCET_SECRET);
    const asset = new Asset(AQUARIUS_USDC_CODE, AQUARIUS_USDC_ISSUER);
    console.warn("[faucet] Aquarius: reading account");
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

    console.warn("[faucet] Aquarius: asking the wallet to sign");
    let userSigned = await signStellar(builtTx.toXDR());
    // The faucet (issuer) must co-sign. Some wallets return only their own signature, so add it back if it is missing.
    console.warn("[faucet] Aquarius signed for:", signedFor(userSigned, address));
    try {
      console.warn("[faucet] wallet network per Dynamic:", await require("@/chain/dynamic").getStellarNetwork());
    } catch (e) {
      console.warn("[faucet] getStellarNetwork failed:", String(e));
    }
    const signedTx = TransactionBuilder.fromXDR(userSigned, NETWORK_PASSPHRASE);
    const hint = faucetKeypair.signatureHint();
    if (!signedTx.signatures.some((sg) => sg.hint().equals(hint))) {
      signedTx.sign(faucetKeypair);
      userSigned = signedTx.toXDR();
    }
    const hRes = await fetch("https://horizon-testnet.stellar.org/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ tx: userSigned }).toString(),
    });
    const hBody = (await hRes.json().catch(() => ({}))) as { hash?: string; detail?: string; title?: string };
    if (!hRes.ok && !hBody.hash) {
      throw new Error(`Aquarius USDC: ${horizonReason(hBody, `submission failed (${hRes.status})`)}`);
    }
    return hBody.hash || "aquarius_funded";
  }

  throw new Error(`Unsupported faucet token: ${sym}`);
}
