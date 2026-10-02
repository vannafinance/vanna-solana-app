import { type Connection, PublicKey, SystemProgram, type TransactionInstruction } from "@solana/web3.js";

import { sharesToRedeem } from "@/lib/earn/share-math";

import { type AssetInfo, assets } from "./assets";
import { associatedTokenAddress, shareMintAddress, TOKEN_PROGRAM, tokenProgramOf } from "./program-accounts";
import { readTokenAmount } from "./earn-deposits";
import { type SigningHooks, sendInstructions } from "./send-transaction";
import { closeAccount, createAssociatedTokenAccountIdempotent, initializeAccount3, syncNative } from "./token-instructions";
import { lenderRedeemInstruction, lenderSupplyInstruction } from "./vanna-instructions";

const TOKEN_ACCOUNT_SIZE = 165;

function assetOf(symbol: string): AssetInfo {
  const asset = assets.find((candidate) => candidate.symbol === symbol);
  if (!asset) throw new Error(`Unknown asset ${symbol}`);
  return asset;
}

// Supplying is priced by the vault's own share accounting with no market impact, so a minimum of one share only
// guards against a zero mint; the amount the user typed is what leaves the wallet.
export function supplyInstructions(owner: PublicKey, asset: AssetInfo, amount: bigint): TransactionInstruction[] {
  const mint = new PublicKey(asset.mint);
  const tokenProgram = tokenProgramOf(asset);
  const source = associatedTokenAddress(owner, mint, tokenProgram);
  const prepare = [createAssociatedTokenAccountIdempotent(owner, source, owner, mint, tokenProgram)];
  if (asset.symbol === "SOL") prepare.push(SystemProgram.transfer({ fromPubkey: owner, toPubkey: source, lamports: amount }), syncNative(source));
  return [...prepare, lenderSupplyInstruction({ lender: owner, asset, lenderTokenAccount: source, amount, minSharesOut: 1n })];
}

// Native SOL is redeemed into a throwaway wrapped account that is closed in the same transaction, so the wallet's own
// wrapped-SOL balance is never touched.
export async function redeemInstructions(owner: PublicKey, asset: AssetInfo, shares: bigint, rentLamports: number): Promise<TransactionInstruction[]> {
  const mint = new PublicKey(asset.mint);
  const tokenProgram = tokenProgramOf(asset);

  if (asset.symbol !== "SOL") {
    const destination = associatedTokenAddress(owner, mint, tokenProgram);
    return [
      createAssociatedTokenAccountIdempotent(owner, destination, owner, mint, tokenProgram),
      lenderRedeemInstruction({ lender: owner, asset, lenderTokenAccount: destination, shares, minAssetsOut: 0n }),
    ];
  }

  const seed = `vanna${Date.now().toString(36)}`;
  const temporary = await PublicKey.createWithSeed(owner, seed, TOKEN_PROGRAM);
  return [
    SystemProgram.createAccountWithSeed({ fromPubkey: owner, basePubkey: owner, seed, newAccountPubkey: temporary, lamports: rentLamports, space: TOKEN_ACCOUNT_SIZE, programId: TOKEN_PROGRAM }),
    initializeAccount3(temporary, mint, owner),
    lenderRedeemInstruction({ lender: owner, asset, lenderTokenAccount: temporary, shares, minAssetsOut: 0n }),
    closeAccount(temporary, owner, owner),
  ];
}

export async function supplyToVault(connection: Connection, owner: PublicKey, symbol: string, amount: bigint, hooks: SigningHooks): Promise<string> {
  return sendInstructions(connection, owner, supplyInstructions(owner, assetOf(symbol), amount), hooks);
}

export class NothingToWithdrawError extends Error {
  constructor() {
    super("The wallet holds no shares in this vault.");
    this.name = "NothingToWithdrawError";
  }
}

export async function withdrawFromVault(
  connection: Connection,
  owner: PublicKey,
  symbol: string,
  request: { amount: bigint; supplied: bigint; exchangeRate: bigint },
  hooks: SigningHooks,
): Promise<string> {
  const asset = assetOf(symbol);
  const shareAccount = associatedTokenAddress(owner, shareMintAddress(new PublicKey(asset.mint)), TOKEN_PROGRAM);
  const [info, rent] = await Promise.all([connection.getAccountInfo(shareAccount, "confirmed"), connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE)]);
  const held = info === null ? 0n : readTokenAmount(info.data);
  if (held === 0n) throw new NothingToWithdrawError();

  const shares = sharesToRedeem(request.amount, request.supplied, held, request.exchangeRate);
  return sendInstructions(connection, owner, await redeemInstructions(owner, asset, shares, rent), hooks);
}
