import { type AccountMeta, PublicKey } from "@solana/web3.js";

import type { AssetInfo } from "./assets";
import { InstructionData, type Meta, vannaInstruction } from "./instruction-encoding";
import { priceAccountAddress } from "./oracle-prices";
import {
  ASSOCIATED_TOKEN_PROGRAM,
  assetConfigAddress,
  associatedTokenAddress,
  debtPositionAddress,
  marginAddress,
  protocolConfigAddress,
  reserveAddress,
  swapAuthorityAddress,
  SYSTEM_PROGRAM,
  tokenProgramOf,
} from "./program-accounts";

const DEPOSIT_COLLATERAL = [238, 206, 161, 246, 218, 26, 100, 157];
const OPEN_DEBT_POSITION = [144, 183, 201, 223, 74, 100, 20, 205];
const BORROW = [125, 34, 221, 55, 252, 190, 132, 154];
const MARGIN_SWAP = [135, 21, 70, 23, 50, 234, 24, 220];
const REPAY_FROM_MARGIN = [108, 103, 220, 205, 63, 240, 73, 147];
const WITHDRAW_COLLATERAL = [81, 34, 228, 68, 219, 88, 210, 28];

export const JUPITER_PROGRAM = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
const U128_MAX = (1n << 128n) - 1n;

const mintOf = (asset: AssetInfo) => new PublicKey(asset.mint);

export function marginVaultAddress(margin: PublicKey, asset: AssetInfo) {
  return associatedTokenAddress(margin, mintOf(asset), tokenProgramOf(asset));
}

export function depositCollateralInstruction({ authority, asset, amount, source }: { authority: PublicKey; asset: AssetInfo; amount: bigint; source: PublicKey }) {
  const margin = marginAddress(authority);
  return vannaInstruction(new InstructionData(DEPOSIT_COLLATERAL).u64(amount), [
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: protocolConfigAddress() },
    { pubkey: margin, isWritable: true },
    { pubkey: assetConfigAddress(mintOf(asset)) },
    { pubkey: mintOf(asset) },
    { pubkey: source, isWritable: true },
    { pubkey: marginVaultAddress(margin, asset), isWritable: true },
    { pubkey: tokenProgramOf(asset) },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM },
    { pubkey: SYSTEM_PROGRAM },
  ]);
}

export function openDebtPositionInstruction({ authority, asset }: { authority: PublicKey; asset: AssetInfo }) {
  const margin = marginAddress(authority);
  const reserve = reserveAddress(mintOf(asset));
  return vannaInstruction(new InstructionData(OPEN_DEBT_POSITION), [
    { pubkey: authority, isSigner: true },
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: margin },
    { pubkey: assetConfigAddress(mintOf(asset)) },
    { pubkey: reserve },
    { pubkey: debtPositionAddress(margin, reserve), isWritable: true },
    { pubkey: SYSTEM_PROGRAM },
  ]);
}

export function borrowInstruction({ authority, asset, amount, remaining }: { authority: PublicKey; asset: AssetInfo; amount: bigint; remaining: readonly AccountMeta[] }) {
  const margin = marginAddress(authority);
  const mint = mintOf(asset);
  const reserve = reserveAddress(mint);
  const tokenProgram = tokenProgramOf(asset);
  return vannaInstruction(new InstructionData(BORROW).u64(amount).u128(U128_MAX), [
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: protocolConfigAddress() },
    { pubkey: margin, isWritable: true },
    { pubkey: assetConfigAddress(mint) },
    { pubkey: reserve, isWritable: true },
    { pubkey: debtPositionAddress(margin, reserve), isWritable: true },
    { pubkey: priceAccountAddress(asset) },
    { pubkey: mint },
    { pubkey: associatedTokenAddress(reserve, mint, tokenProgram), isWritable: true },
    { pubkey: marginVaultAddress(margin, asset), isWritable: true },
    { pubkey: tokenProgram },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM },
    { pubkey: SYSTEM_PROGRAM },
    ...remaining,
  ]);
}

type MarginSwapArgs = {
  authority: PublicKey;
  input: AssetInfo;
  output: AssetInfo;
  amountIn: bigint;
  minAmountOut: bigint;
  route: { accounts: readonly AccountMeta[]; data: Uint8Array };
  remaining: readonly AccountMeta[];
};

// The swap runs through a program-owned authority with its own escrow accounts for each side, so Jupiter's route never
// touches the margin vaults directly.
export function marginSwapInstruction({ authority, input, output, amountIn, minAmountOut, route, remaining }: MarginSwapArgs) {
  const margin = marginAddress(authority);
  const swapAuthority = swapAuthorityAddress(margin);
  const inputProgram = tokenProgramOf(input);
  const outputProgram = tokenProgramOf(output);
  const routeMetas: Meta[] = route.accounts.map((meta) => ({ pubkey: meta.pubkey, isSigner: false, isWritable: meta.isWritable }));
  return vannaInstruction(new InstructionData(MARGIN_SWAP).u64(amountIn).u64(minAmountOut).u16(route.accounts.length).bytes(route.data), [
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: protocolConfigAddress() },
    { pubkey: margin, isWritable: true },
    { pubkey: assetConfigAddress(mintOf(input)) },
    { pubkey: assetConfigAddress(mintOf(output)) },
    { pubkey: mintOf(input) },
    { pubkey: mintOf(output) },
    { pubkey: priceAccountAddress(input) },
    { pubkey: priceAccountAddress(output) },
    { pubkey: marginVaultAddress(margin, input), isWritable: true },
    { pubkey: marginVaultAddress(margin, output), isWritable: true },
    { pubkey: swapAuthority },
    { pubkey: associatedTokenAddress(swapAuthority, mintOf(input), inputProgram), isWritable: true },
    { pubkey: associatedTokenAddress(swapAuthority, mintOf(output), outputProgram), isWritable: true },
    { pubkey: JUPITER_PROGRAM },
    { pubkey: inputProgram },
    { pubkey: outputProgram },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM },
    { pubkey: SYSTEM_PROGRAM },
    ...routeMetas,
    ...remaining,
  ]);
}

// With repayAll the program repays the exact current debt itself and ignores the amount, which is what closing needs:
// the swap's real proceeds are only known once it has run, earlier in the same transaction.
export function repayFromMarginInstruction({ authority, asset, maxAssets, repayAll }: { authority: PublicKey; asset: AssetInfo; maxAssets: bigint; repayAll: boolean }) {
  const margin = marginAddress(authority);
  const mint = mintOf(asset);
  const reserve = reserveAddress(mint);
  const tokenProgram = tokenProgramOf(asset);
  return vannaInstruction(new InstructionData(REPAY_FROM_MARGIN).u64(maxAssets).bool(repayAll), [
    { pubkey: authority, isSigner: true },
    { pubkey: margin, isWritable: true },
    { pubkey: assetConfigAddress(mint) },
    { pubkey: reserve, isWritable: true },
    { pubkey: debtPositionAddress(margin, reserve), isWritable: true },
    { pubkey: mint },
    { pubkey: marginVaultAddress(margin, asset), isWritable: true },
    { pubkey: associatedTokenAddress(reserve, mint, tokenProgram), isWritable: true },
    { pubkey: tokenProgram },
  ]);
}

export function withdrawCollateralInstruction({
  authority,
  asset,
  amount,
  destination,
  remaining,
}: {
  authority: PublicKey;
  asset: AssetInfo;
  amount: bigint;
  destination: PublicKey;
  remaining: readonly AccountMeta[];
}) {
  const margin = marginAddress(authority);
  return vannaInstruction(new InstructionData(WITHDRAW_COLLATERAL).u64(amount).u128(0n), [
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: protocolConfigAddress() },
    { pubkey: margin, isWritable: true },
    { pubkey: assetConfigAddress(mintOf(asset)) },
    { pubkey: mintOf(asset) },
    { pubkey: priceAccountAddress(asset) },
    { pubkey: destination, isWritable: true },
    { pubkey: marginVaultAddress(margin, asset), isWritable: true },
    { pubkey: tokenProgramOf(asset) },
    ...remaining,
  ]);
}
