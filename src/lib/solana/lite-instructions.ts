import { type AccountMeta, PublicKey } from "@solana/web3.js";

import { type AssetInfo } from "./assets";
import { InstructionData, type Meta, vannaInstruction } from "./instruction-encoding";
import { INSTRUCTIONS_SYSVAR, KAMINO_MAIN_MARKET, KAMINO_MARKET_AUTHORITY, KAMINO_PROGRAM, kaminoReserveOf, type YieldSymbol } from "./kamino";
import { priceAccountAddress } from "./oracle-prices";
import {
  ASSOCIATED_TOKEN_PROGRAM,
  assetConfigAddress,
  associatedTokenAddress,
  debtPositionAddress,
  liteStrategyAddress,
  marginAddress,
  protocolConfigAddress,
  reserveAddress,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
  tokenProgramOf,
} from "./program-accounts";

const LITE_SUPPLY = [155, 89, 73, 112, 205, 185, 141, 211];
const LITE_REDUCE_REDEEM = [219, 229, 233, 110, 15, 4, 241, 235];
const LITE_REDUCE_REPAY = [10, 133, 81, 55, 91, 83, 58, 2];

type LiteCall = { owner: PublicKey; asset: AssetInfo & { symbol: YieldSymbol }; litePosition: PublicKey };

// The accounts every Kamino position instruction names, derived once from the asset the position holds.
function liteAccounts({ owner, asset, litePosition }: LiteCall) {
  const mint = new PublicKey(asset.mint);
  const margin = marginAddress(owner);
  const reserve = reserveAddress(mint);
  const kamino = kaminoReserveOf(asset.symbol);
  const tokenProgram = tokenProgramOf(asset);
  return {
    mint,
    margin,
    reserve,
    kamino,
    tokenProgram,
    litePosition,
    protocolConfig: protocolConfigAddress(),
    assetConfig: assetConfigAddress(mint),
    debtPosition: debtPositionAddress(margin, reserve),
    liteStrategy: liteStrategyAddress(mint),
    marginUnderlying: associatedTokenAddress(margin, mint, tokenProgram),
    marginReceipts: associatedTokenAddress(margin, kamino.collateralMint, TOKEN_PROGRAM),
  };
}

// Where the Kamino program sits in the account list: the same six accounts, in the same order, for supply and redeem.
function kaminoMetas(a: ReturnType<typeof liteAccounts>): Meta[] {
  return [
    { pubkey: KAMINO_PROGRAM },
    { pubkey: KAMINO_MAIN_MARKET },
    { pubkey: KAMINO_MARKET_AUTHORITY },
    { pubkey: a.kamino.reserve, isWritable: true },
    { pubkey: a.kamino.liquidityVault, isWritable: true },
    { pubkey: a.kamino.collateralMint, isWritable: true },
  ];
}

// Supplies the margin account's own balance of the asset into Kamino. attributeSharesDelta ties the debt a borrow in the
// same transaction created to this position, so closing it later repays that debt from what Kamino returns.
export function liteSupplyInstruction(call: LiteCall & { amount: bigint; attributeSharesDelta: bigint }) {
  const a = liteAccounts(call);
  return vannaInstruction(new InstructionData(LITE_SUPPLY).u64(call.amount).u128(call.attributeSharesDelta), [
    { pubkey: call.owner, isSigner: true, isWritable: true },
    { pubkey: a.protocolConfig },
    { pubkey: a.assetConfig },
    { pubkey: a.mint },
    { pubkey: a.margin, isWritable: true },
    { pubkey: a.marginUnderlying, isWritable: true },
    { pubkey: a.reserve },
    { pubkey: a.debtPosition, isWritable: true },
    { pubkey: a.liteStrategy },
    { pubkey: a.litePosition, isWritable: true },
    ...kaminoMetas(a),
    { pubkey: a.marginReceipts, isWritable: true },
    { pubkey: INSTRUCTIONS_SYSVAR },
    { pubkey: a.tokenProgram },
    { pubkey: TOKEN_PROGRAM },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM },
    { pubkey: SYSTEM_PROGRAM },
  ]);
}

// An exit is two instructions on purpose: one program call that redeems from Kamino, repays and health checks overflows
// the stack. The redeem lands the underlying in the margin vault; the repay then settles the debt and sends the rest on.
export function liteReduceRedeemInstruction(call: LiteCall & { exitBps: number; minUnderlyingOut: bigint }) {
  const a = liteAccounts(call);
  return vannaInstruction(new InstructionData(LITE_REDUCE_REDEEM).u16(call.exitBps).u64(call.minUnderlyingOut), [
    { pubkey: call.owner, isSigner: true, isWritable: true },
    { pubkey: a.protocolConfig },
    { pubkey: a.assetConfig },
    { pubkey: a.reserve, isWritable: true },
    { pubkey: a.mint },
    { pubkey: a.marginUnderlying, isWritable: true },
    { pubkey: a.margin, isWritable: true },
    { pubkey: a.debtPosition, isWritable: true },
    { pubkey: a.liteStrategy },
    { pubkey: a.litePosition, isWritable: true },
    ...kaminoMetas(a),
    { pubkey: a.marginReceipts, isWritable: true },
    { pubkey: INSTRUCTIONS_SYSVAR },
    { pubkey: a.tokenProgram },
    { pubkey: TOKEN_PROGRAM },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM },
    { pubkey: SYSTEM_PROGRAM },
  ]);
}

export function liteReduceRepayInstruction(call: LiteCall & { exitBps: number; userTokenAccount: PublicKey; remaining: readonly AccountMeta[] }) {
  const a = liteAccounts(call);
  return vannaInstruction(new InstructionData(LITE_REDUCE_REPAY).u16(call.exitBps), [
    { pubkey: call.owner, isSigner: true, isWritable: true },
    { pubkey: a.protocolConfig },
    { pubkey: a.assetConfig },
    { pubkey: a.reserve, isWritable: true },
    { pubkey: a.mint },
    { pubkey: priceAccountAddress(call.asset) },
    { pubkey: a.marginUnderlying, isWritable: true },
    { pubkey: call.userTokenAccount, isWritable: true },
    { pubkey: associatedTokenAddress(a.reserve, a.mint, a.tokenProgram), isWritable: true },
    { pubkey: a.margin, isWritable: true },
    { pubkey: a.debtPosition, isWritable: true },
    { pubkey: a.liteStrategy },
    { pubkey: a.litePosition, isWritable: true },
    { pubkey: KAMINO_PROGRAM },
    { pubkey: a.kamino.reserve },
    { pubkey: a.kamino.collateralMint },
    { pubkey: a.tokenProgram },
    { pubkey: SYSTEM_PROGRAM },
    ...call.remaining,
  ]);
}
