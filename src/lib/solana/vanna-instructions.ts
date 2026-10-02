import { PublicKey, TransactionInstruction } from "@solana/web3.js";

import type { AssetInfo } from "./assets";
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
  VANNA_PROGRAM,
} from "./program-accounts";

const CREATE_MARGIN = [105, 23, 202, 134, 147, 166, 130, 205];
const LENDER_SUPPLY = [52, 247, 77, 250, 74, 122, 100, 33];
const LENDER_REDEEM = [22, 48, 40, 70, 164, 48, 75, 224];

const U64_MAX = (1n << 64n) - 1n;

function encode(discriminator: readonly number[], ...args: bigint[]): Buffer {
  const data = Buffer.alloc(8 + args.length * 8);
  data.set(discriminator, 0);
  args.forEach((value, index) => {
    if (value < 0n || value > U64_MAX) throw new RangeError("amount does not fit in u64");
    data.writeBigUInt64LE(value, 8 + index * 8);
  });
  return data;
}

type Meta = { pubkey: PublicKey; isSigner?: boolean; isWritable?: boolean };

function instruction(data: Buffer, metas: Meta[]) {
  return new TransactionInstruction({
    programId: VANNA_PROGRAM,
    data,
    keys: metas.map(({ pubkey, isSigner = false, isWritable = false }) => ({ pubkey, isSigner, isWritable })),
  });
}

export function createMarginInstruction(authority: PublicKey) {
  return instruction(encode(CREATE_MARGIN), [
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
  return instruction(encode(LENDER_SUPPLY, amount, minSharesOut), [
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
  return instruction(encode(LENDER_REDEEM, shares, minAssetsOut), [
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
