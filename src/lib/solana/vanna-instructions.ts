import { PublicKey } from "@solana/web3.js";

import type { AssetInfo } from "./assets";
import { InstructionData, vannaInstruction } from "./instruction-encoding";
import {
  ASSOCIATED_TOKEN_PROGRAM,
  assetConfigAddress,
  associatedTokenAddress,
  marginAddress,
  protocolConfigAddress,
  reserveAddress,
  shareMintAddress,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
  tokenProgramOf,
} from "./program-accounts";

const CREATE_MARGIN = [105, 23, 202, 134, 147, 166, 130, 205];
const LENDER_SUPPLY = [52, 247, 77, 250, 74, 122, 100, 33];
const LENDER_REDEEM = [22, 48, 40, 70, 164, 48, 75, 224];

export function createMarginInstruction(authority: PublicKey) {
  return vannaInstruction(new InstructionData(CREATE_MARGIN), [
    { pubkey: authority, isSigner: true },
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: marginAddress(authority), isWritable: true },
    { pubkey: SYSTEM_PROGRAM },
  ]);
}

function lenderAccounts(lender: PublicKey, asset: AssetInfo, lenderTokenAccount: PublicKey) {
  const mint = new PublicKey(asset.mint);
  const reserve = reserveAddress(mint);
  const shareMint = shareMintAddress(mint);
  const tokenProgram = tokenProgramOf(asset);
  return {
    protocolConfig: protocolConfigAddress(),
    assetConfig: assetConfigAddress(mint),
    reserve,
    mint,
    lenderTokenAccount,
    liquidityVault: associatedTokenAddress(reserve, mint, tokenProgram),
    shareMint,
    lenderShareAccount: associatedTokenAddress(lender, shareMint, TOKEN_PROGRAM),
    tokenProgram,
  };
}

type LenderCall = { lender: PublicKey; asset: AssetInfo; lenderTokenAccount: PublicKey };

export function lenderSupplyInstruction({ lender, asset, lenderTokenAccount, amount, minSharesOut }: LenderCall & { amount: bigint; minSharesOut: bigint }) {
  const a = lenderAccounts(lender, asset, lenderTokenAccount);
  return vannaInstruction(new InstructionData(LENDER_SUPPLY).u64(amount).u64(minSharesOut), [
    { pubkey: lender, isSigner: true, isWritable: true },
    { pubkey: a.protocolConfig },
    { pubkey: a.assetConfig },
    { pubkey: a.reserve, isWritable: true },
    { pubkey: a.mint },
    { pubkey: a.lenderTokenAccount, isWritable: true },
    { pubkey: a.liquidityVault, isWritable: true },
    { pubkey: a.shareMint, isWritable: true },
    { pubkey: a.lenderShareAccount, isWritable: true },
    { pubkey: a.tokenProgram },
    { pubkey: TOKEN_PROGRAM },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM },
    { pubkey: SYSTEM_PROGRAM },
  ]);
}

export function lenderRedeemInstruction({ lender, asset, lenderTokenAccount, shares, minAssetsOut }: LenderCall & { shares: bigint; minAssetsOut: bigint }) {
  const a = lenderAccounts(lender, asset, lenderTokenAccount);
  return vannaInstruction(new InstructionData(LENDER_REDEEM).u64(shares).u64(minAssetsOut), [
    { pubkey: lender, isSigner: true },
    { pubkey: a.protocolConfig },
    { pubkey: a.assetConfig },
    { pubkey: a.reserve, isWritable: true },
    { pubkey: a.mint },
    { pubkey: a.lenderTokenAccount, isWritable: true },
    { pubkey: a.liquidityVault, isWritable: true },
    { pubkey: a.shareMint, isWritable: true },
    { pubkey: a.lenderShareAccount, isWritable: true },
    { pubkey: a.tokenProgram },
    { pubkey: TOKEN_PROGRAM },
  ]);
}
