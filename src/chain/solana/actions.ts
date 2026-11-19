// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\lend.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\exec.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\flash-repay.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\swap.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\perps.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\phoenix.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\kamino.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\perena.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\wsol.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\math.ts
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\server\fork-faucet.ts

import { Buffer } from "buffer";
import { sha256 } from "@noble/hashes/sha256";

import { requireActiveRealWallet } from "@/chain/sign";
import {
  PRICE_BOOK,
  RESERVES,
  VANNA_PROGRAM_ID,
} from "./config";
import { decode58, findPda } from "./pda";
import { base58 } from "./prices";
import { fetchSolanaAccount } from "./account";
import { fetchSolanaPools, readLenderTotal } from "./pools";
import { decodeBase64, forkNow, rpc } from "./rpc";
import { alignKaminoReserveOnFork, ensureFreshForkPrices } from "./fork-prices";
import {
  COMPUTE_BUDGET_PROGRAM_ID,
  type AccountMeta,
  type RawInstruction,
  MAX_TX_BYTES,
  BatchPartError,
  type BatchControl,
  type BatchPart,
  sendSolanaBatch,
  sendSolanaInstructions,
  simulateAsOne,
  txSizeWithoutLookupTable,
  walletSafeLookupTables,
  WalletTxTooLargeError,
  type AddressLookupTableAccount,
} from "./submit";
import { ALL_VAULT_MINTS } from "./tokens";
import { fetchTitanQuote, marginTitanCall, missingAtlasAccounts, TITAN_PROGRAM_ID, TitanLimitUnsupportedError, type TitanRouteLimit, TitanUnavailableError } from "./titan";

// ---------------------------------------------------------------------------------------------
// Program IDs & Protocol Constants
// ---------------------------------------------------------------------------------------------

export const ORACLE_PROGRAM_ID = "FXY5DRfekMUTbUp4uyCFpCZmCccrp6kPq3hTM4GRihnc";
export const VALIDATOR_PROGRAM_ID = "6fND3vhtstp486iE6rsSNVUox3kcjNNRsSLAN7ZPs7th";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";

export const JUPITER_V6_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
export const KLEND_PROGRAM_ID = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";
export const PHOENIX_PROGRAM_ID = "EtrnLzgbS7nMMy5fbD42kXiUzGg8XQzJ972Xtk1cjWih";
export const EMBER_PROGRAM_ID = "EMBERpYNE6ehWmXymZZS2skiFmCa9V5dp14e1iduM5qy";
export const PHOENIX_EXCHANGE = "2zskx2iyCvb6Stg7RBZkt1f6MrF4dpYtMG3yMvKwqtUZ";
export const PHUSD_MINT = "PhUsd11YkbjSaWjFncfAAmatntsjx3MgDR9B6g1ks3A";
export const PERENA_PROGRAM_ID = "save8RQVPMWNTzU18t3GBvBkN9hT7jsGjiCQ28FpD9H";

export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const EMPTY_ASSET_INDEX = 65535;
export const WAD = 1_000_000_000_000_000_000n;
export const LEND_SLIPPAGE_BPS = 50n;
export const MIN_INITIAL_SHARES = 1_000n;
export const EXEC_COMPUTE_UNITS = 1_400_000;
export const BATCH_COMPUTE_UNITS = 600_000;

// ---------------------------------------------------------------------------------------------
// Token Registry
// ---------------------------------------------------------------------------------------------

export interface TokenInfo {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  tokenProgram: string;
  isNative: boolean;
  faucetAmount: number;
  lendable: boolean;
  depositable: boolean;
}

export const TOKENS: TokenInfo[] = [
  {
    symbol: "SOL",
    name: "Solana",
    mint: WSOL_MINT,
    decimals: 9,
    tokenProgram: TOKEN_PROGRAM_ID,
    isNative: true,
    faucetAmount: 1000,
    lendable: true,
    depositable: true,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    mint: USDC_MINT,
    decimals: 6,
    tokenProgram: TOKEN_PROGRAM_ID,
    isNative: false,
    faucetAmount: 1000,
    lendable: true,
    depositable: true,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    tokenProgram: TOKEN_PROGRAM_ID,
    isNative: false,
    faucetAmount: 1000,
    lendable: true,
    depositable: true, // offered as margin collateral again (backend commit 85c0dbc, 2026-11-16)
  },
  {
    symbol: "JitoSOL",
    name: "Jito Staked SOL",
    mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    decimals: 9,
    tokenProgram: TOKEN_PROGRAM_ID,
    isNative: false,
    faucetAmount: 1000,
    lendable: false,
    depositable: true,
  },
  {
    symbol: "JupSOL",
    name: "Jupiter Staked SOL",
    mint: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
    decimals: 9,
    tokenProgram: TOKEN_PROGRAM_ID,
    isNative: false,
    faucetAmount: 1000,
    lendable: false,
    depositable: true,
  },
  {
    symbol: "JupUSD",
    name: "Jupiter USD",
    mint: "JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD",
    decimals: 6,
    tokenProgram: TOKEN_PROGRAM_ID,
    isNative: false,
    faucetAmount: 1000,
    lendable: false,
    depositable: true,
  },
  {
    symbol: "NVDAx",
    name: "NVIDIA xStock",
    mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
    decimals: 8,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    isNative: false,
    faucetAmount: 10,
    lendable: false,
    depositable: true,
  },
  {
    symbol: "GOOGLx",
    name: "Alphabet xStock",
    mint: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN",
    decimals: 8,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    isNative: false,
    faucetAmount: 10,
    lendable: false,
    depositable: true,
  },
  {
    symbol: "AAPLx",
    name: "Apple xStock",
    mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
    decimals: 8,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    isNative: false,
    faucetAmount: 10,
    lendable: false,
    depositable: true,
  },
  {
    symbol: "TSLAx",
    name: "Tesla xStock",
    mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
    decimals: 8,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    isNative: false,
    faucetAmount: 10,
    lendable: false,
    depositable: true,
  },
  {
    symbol: "SKR",
    name: "Seeker",
    mint: "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3",
    decimals: 6,
    tokenProgram: TOKEN_PROGRAM_ID,
    isNative: false,
    faucetAmount: 100_000,
    lendable: true,
    depositable: true,
  },
];

export function findToken(symbol: string | null | undefined): TokenInfo | undefined {
  if (!symbol) return undefined;
  const upper = symbol.trim().toUpperCase();
  return TOKENS.find((t) => t.symbol.toUpperCase() === (upper === "WSOL" ? "SOL" : upper));
}

export function getToken(symbol: string): TokenInfo {
  const t = findToken(symbol);
  if (!t) throw new Error(`Unknown token: ${symbol}`);
  return t;
}

export function tokenByMint(mint: string): TokenInfo | undefined {
  return TOKENS.find((t) => t.mint === mint);
}

// ---------------------------------------------------------------------------------------------
// Math & Number Formatting
// ---------------------------------------------------------------------------------------------

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\math.ts:toRaw
export function toRaw(ui: string | number, decimals: number): bigint {
  const s = String(ui).trim();
  if (!s || s === "0") return 0n;
  const [whole, frac = ""] = s.split(".");
  const paddedFrac = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + paddedFrac);
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\math.ts:fromRaw
export function fromRaw(raw: bigint, decimals: number): string {
  if (raw === 0n) return "0";
  const s = raw.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\math.ts:mulDivFloor
export function mulDivFloor(a: bigint, b: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error("mulDivFloor: division by zero");
  return (a * b) / denominator;
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\math.ts:mulDivCeil
export function mulDivCeil(a: bigint, b: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error("mulDivCeil: division by zero");
  const product = a * b;
  return product === 0n ? 0n : (product + denominator - 1n) / denominator;
}

// ---------------------------------------------------------------------------------------------
// Anchor Discriminator & PDA Builders
// ---------------------------------------------------------------------------------------------

/**
 * Anchor 8-byte instruction discriminator: sha256("global:<name>")[0..8].
 */
/** The program's `tokens: u8` argument (user_borrow, user_withdraw_collateral, margin_execute): 255 = scan every token (backend pdas.ts ALL_TOKENS). */
export const ALL_TOKENS = 255;
/** The `tokens` argument for a list of health accounts: the compact count when buildHealthRemainingAccounts made one, else ALL_TOKENS. */
const tokensArg = (accounts: AccountMeta[] | { tokens?: number }): number => ("tokens" in accounts && typeof accounts.tokens === "number" ? accounts.tokens : ALL_TOKENS);

export function anchorDiscriminator(name: string): Buffer {
  return Buffer.from(sha256(Buffer.from(`global:${name}`)).subarray(0, 8));
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:protocolConfigPda
export const protocolConfigPda = (): string => findPda(["protocol"], VANNA_PROGRAM_ID);

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:assetConfigPda
export const assetConfigPda = (mint: string): string => findPda(["asset", decode58(mint)], VANNA_PROGRAM_ID);

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:reservePda
export const reservePda = (mint: string): string => findPda(["reserve", decode58(mint)], VANNA_PROGRAM_ID);

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:shareMintPda
export const shareMintPda = (mint: string): string => findPda(["share_mint", decode58(mint)], VANNA_PROGRAM_ID);

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:marginPda
export const marginPda = (authority: string): string => findPda(["margin", decode58(authority)], VANNA_PROGRAM_ID);

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:debtPositionPda
export const debtPositionPda = (margin: string, reserve: string): string =>
  findPda(["debt", decode58(margin), decode58(reserve)], VANNA_PROGRAM_ID);

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:integrationPda
export const integrationPda = (programId: string): string =>
  findPda(["integration", decode58(programId)], VANNA_PROGRAM_ID);

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:priceBookPda
export const priceBookPda = (): string => PRICE_BOOK;

/**
 * Derives Associated Token Address: PDA([owner, tokenProgram, mint], ASSOCIATED_TOKEN_PROGRAM_ID).
 * Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:walletAta
 */
export function tokenAta(owner: string, mint: string, tokenProgram: string = TOKEN_PROGRAM_ID): string {
  return findPda([decode58(owner), decode58(tokenProgram), decode58(mint)], ASSOCIATED_TOKEN_PROGRAM_ID);
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:marginVault
export const marginVault = (margin: string, mint: string, tokenProgram: string): string =>
  tokenAta(margin, mint, tokenProgram);

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:reserveVault
export const reserveVault = (mint: string, tokenProgram: string): string =>
  tokenAta(reservePda(mint), mint, tokenProgram);

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\pdas.ts:lenderShareAccount
export const lenderShareAccount = (lender: string, underlyingMint: string): string =>
  tokenAta(lender, shareMintPda(underlyingMint), TOKEN_PROGRAM_ID);

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\phoenix.ts:phoenixTraderPda
export const phoenixTraderPda = (margin: string): string =>
  findPda(["trader", decode58(margin), Uint8Array.of(0, 0)], PHOENIX_PROGRAM_ID);

// ---------------------------------------------------------------------------------------------
// Raw Instruction Builders (SPL Token, System Program, ATA)
// ---------------------------------------------------------------------------------------------

/**
 * SystemProgram.transfer: discriminator u32 = 2 (4 bytes LE) + lamports u64 LE (8 bytes) -> 12 bytes.
 */
export function systemTransferIx(fromPubkey: string, toPubkey: string, lamports: bigint): RawInstruction {
  const data = Buffer.alloc(12);
  data.writeUInt32LE(2, 0);
  data.writeBigUInt64LE(lamports, 4);
  return {
    programId: SYSTEM_PROGRAM_ID,
    keys: [
      { pubkey: fromPubkey, isSigner: true, isWritable: true },
      { pubkey: toPubkey, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
 * Derives a deterministic address on curve via SHA-256(base || seed || programId).
 */
export function createWithSeed(base: string, seed: string, programId: string): string {
  const buf = Buffer.concat([decode58(base), Buffer.from(seed, "utf8"), decode58(programId)]);
  return base58(sha256(buf));
}

/**
 * SystemProgram.createAccountWithSeed: discriminator u32 = 3, base 32 bytes, seed length u64 LE + seed utf8 bytes, lamports u64, space u64, owner 32 bytes.
 */
export function systemCreateAccountWithSeedIx(
  fromPubkey: string,
  newAccountPubkey: string,
  basePubkey: string,
  seed: string,
  lamports: bigint,
  space: bigint,
  programId: string
): RawInstruction {
  const seedBytes = Buffer.from(seed, "utf8");
  const data = Buffer.alloc(4 + 32 + 8 + seedBytes.length + 8 + 8 + 32);
  let o = 0;
  data.writeUInt32LE(3, o); o += 4;
  Buffer.from(decode58(basePubkey)).copy(data, o); o += 32;
  data.writeBigUInt64LE(BigInt(seedBytes.length), o); o += 8;
  seedBytes.copy(data, o); o += seedBytes.length;
  data.writeBigUInt64LE(lamports, o); o += 8;
  data.writeBigUInt64LE(space, o); o += 8;
  Buffer.from(decode58(programId)).copy(data, o);
  return {
    programId: SYSTEM_PROGRAM_ID,
    keys: [
      { pubkey: fromPubkey, isSigner: true, isWritable: true },
      { pubkey: newAccountPubkey, isSigner: false, isWritable: true },
      { pubkey: basePubkey, isSigner: true, isWritable: false },
    ],
    data,
  };
}

/**
 * AssociatedTokenProgram.createIdempotent: discriminator u8 = 1.
 */
export function createAssociatedTokenAccountIdempotentIx(
  payer: string,
  ata: string,
  owner: string,
  mint: string,
  tokenProgram: string = TOKEN_PROGRAM_ID
): RawInstruction {
  return {
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  };
}

/**
 * SPL Token transfer: discriminator u8 = 3 + amount u64 LE (8 bytes) -> 9 bytes.
 */
export function splTokenTransferIx(
  source: string,
  destination: string,
  owner: string,
  amount: bigint,
  tokenProgram: string = TOKEN_PROGRAM_ID
): RawInstruction {
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0);
  data.writeBigUInt64LE(amount, 1);
  return {
    programId: tokenProgram,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  };
}

/**
 * SPL Token syncNative: discriminator u8 = 17.
 */
export function splTokenSyncNativeIx(account: string, tokenProgram: string = TOKEN_PROGRAM_ID): RawInstruction {
  return {
    programId: tokenProgram,
    keys: [{ pubkey: account, isSigner: false, isWritable: true }],
    data: Buffer.from([17]),
  };
}

/**
 * SPL Token closeAccount: discriminator u8 = 9.
 */
export function splTokenCloseAccountIx(
  account: string,
  destination: string,
  owner: string,
  tokenProgram: string = TOKEN_PROGRAM_ID
): RawInstruction {
  return {
    programId: tokenProgram,
    keys: [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.from([9]),
  };
}

/**
 * SPL Token initializeAccount3: discriminator u8 = 18 + owner 32 bytes.
 */
export function splTokenInitializeAccount3Ix(
  account: string,
  mint: string,
  owner: string,
  tokenProgram: string = TOKEN_PROGRAM_ID
): RawInstruction {
  const data = Buffer.alloc(33);
  data.writeUInt8(18, 0);
  Buffer.from(decode58(owner)).copy(data, 1);
  return {
    programId: tokenProgram,
    keys: [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
    ],
    data,
  };
}

// ---------------------------------------------------------------------------------------------
// WSOL Wrapping & Temporary WSOL Receiver Helpers
// ---------------------------------------------------------------------------------------------

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\wsol.ts:wrapSolInstructions
export async function wrapSol(owner: string, lamports: bigint): Promise<{ ata: string; existed: boolean; instructions: RawInstruction[] }> {
  const ata = tokenAta(owner, WSOL_MINT, TOKEN_PROGRAM_ID);
  const info = await rpc<{ value: unknown }>("getAccountInfo", [ata, { encoding: "base64" }]);
  const existed = Boolean(info?.value);
  const instructions: RawInstruction[] = [
    createAssociatedTokenAccountIdempotentIx(owner, ata, owner, WSOL_MINT, TOKEN_PROGRAM_ID),
  ];
  if (lamports > 0n) {
    instructions.push(systemTransferIx(owner, ata, lamports));
    instructions.push(splTokenSyncNativeIx(ata, TOKEN_PROGRAM_ID));
  }
  return { ata, existed, instructions };
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\wsol.ts:temporaryWsolReceiver
export async function temporaryWsolReceiver(owner: string): Promise<{ account: string; setup: RawInstruction[]; cleanup: RawInstruction[] }> {
  const seed = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 32);
  const account = createWithSeed(owner, seed, TOKEN_PROGRAM_ID);
  const rent = 2_039_280n; // Rent for 165 bytes token account
  return {
    account,
    setup: [
      systemCreateAccountWithSeedIx(owner, account, owner, seed, rent, 165n, TOKEN_PROGRAM_ID),
      splTokenInitializeAccount3Ix(account, WSOL_MINT, owner, TOKEN_PROGRAM_ID),
    ],
    cleanup: [splTokenCloseAccountIx(account, owner, owner, TOKEN_PROGRAM_ID)],
  };
}

// ---------------------------------------------------------------------------------------------
// Oracle & AssetConfig State Models & Health Scan Builders
// ---------------------------------------------------------------------------------------------

export interface OracleConfigState {
  scopePrices: string;
  scopeChain: number[];
  scopeTwapChain: number[];
  pythPrice: string;
  pythFactor: string;
  klendReserve: string;
  klendProgram: string;
  maxAgeSecs: number;
  maxTwapDivergenceBps: number;
  maxConfidenceBps: number;
}

export interface AssetConfigState {
  address: string;
  mint: string;
  tokenProgram: string;
  reserve: string;
  kind: "token" | "venue";
  oracleProgram: string;
  oracle: OracleConfigState;
  oracleAccounts: string[];
  maxCollateralPerMargin: bigint;
  maxPriceAgeSecs: number;
  maxConfidenceBps: number;
  liquidationBonusBps: number;
  /** AssetConfig.ltv_bps (offset 112) and liquidation_threshold_bps (offset 114), IDL vanna_credit_layer. */
  ltvBps: number;
  liquidationThresholdBps: number;
  assetIndex: number;
  decimals: number;
  collateralEnabled: boolean;
  borrowEnabled: boolean;
  priceSource: string;
  priceSourceAccount: string;
}

// Ported from apps/solana/lib/solana/oracle.ts:emptyOracleConfig
export function emptyOracleConfig(): OracleConfigState {
  return {
    scopePrices: SYSTEM_PROGRAM_ID,
    scopeChain: [65535, 65535, 65535, 65535],
    scopeTwapChain: [65535, 65535, 65535, 65535],
    pythPrice: SYSTEM_PROGRAM_ID,
    pythFactor: SYSTEM_PROGRAM_ID,
    klendReserve: SYSTEM_PROGRAM_ID,
    klendProgram: SYSTEM_PROGRAM_ID,
    maxAgeSecs: 0,
    maxTwapDivergenceBps: 0,
    maxConfidenceBps: 0,
  };
}

// Ported from apps/solana/lib/solana/oracle.ts:oracleAccounts
export function oracleAccounts(o: OracleConfigState): string[] {
  const isSet = (k: string) => k && k !== SYSTEM_PROGRAM_ID && k !== "11111111111111111111111111111111";
  const accs: string[] = [];
  if (isSet(o.scopePrices)) accs.push(o.scopePrices);
  if (isSet(o.pythPrice)) accs.push(o.pythPrice);
  if (isSet(o.pythFactor)) accs.push(o.pythFactor);
  if (isSet(o.klendReserve)) accs.push(o.klendReserve);
  return accs;
}

// Ported from apps/solana/lib/solana/oracle.ts:decodeOracleConfig
export function decodeOracleConfig(data: Buffer, at: number): OracleConfigState {
  const key = (o: number) => base58(data.subarray(at + o, at + o + 32));
  const chain = (o: number) => [0, 1, 2, 3].map((i) => data.readUInt16LE(at + o + 2 * i));
  return {
    scopePrices: key(0),
    scopeChain: chain(32),
    scopeTwapChain: chain(40),
    pythPrice: key(48),
    pythFactor: key(80),
    klendReserve: key(112),
    klendProgram: key(144),
    maxAgeSecs: data.readUInt32LE(at + 176),
    maxTwapDivergenceBps: data.readUInt16LE(at + 180),
    maxConfidenceBps: data.readUInt16LE(at + 182),
  };
}

// Ported from apps/solana/lib/solana/oracle.ts:decodePriceBook
export function decodePriceBook(data: Buffer): Map<string, { mint: string; decimals: number; config: OracleConfigState }> {
  const sources = new Map<string, { mint: string; decimals: number; config: OracleConfigState }>();
  if (data.length < 12) return sources;
  const count = data[9];
  for (let i = 0; i < count; i++) {
    const at = 12 + 220 * i;
    if (data.length < at + 220) break;
    const mint = base58(data.subarray(at, at + 32));
    sources.set(mint, { mint, decimals: data[at + 32], config: decodeOracleConfig(data, at + 36) });
  }
  return sources;
}

// Ported from apps/solana/lib/solana/protocol-state.ts:decodeAssetConfig
export function decodeAssetConfig(
  address: string,
  data: Buffer | null,
  sources: Map<string, { mint: string; decimals: number; config: OracleConfigState }> = new Map()
): AssetConfigState | null {
  if (!data || data.length < 125) return null;
  const mint = base58(data.subarray(8, 40));
  const tokenProgram = base58(data.subarray(40, 72));
  const reserve = base58(data.subarray(72, 104));
  const maxCollateral = data.readBigUInt64LE(104);
  const liquidationBonusBps = data.readUInt16LE(116);
  const assetIndex = data.readUInt16LE(118);
  const decimals = data[120];
  const collateralEnabled = data[121] === 1;
  const borrowEnabled = data[122] === 1;
  const kindVal = data.length > 124 ? data[124] : (data.length > 44 ? data[44] : 0);
  const kind: "token" | "venue" = (kindVal === 1 || (data.length > 44 && data[44] === 1)) ? "venue" : "token";
  const oracleProgram = data.length >= 157 ? base58(data.subarray(125, 157)) : ORACLE_PROGRAM_ID;

  const oracle = sources.get(mint)?.config ?? emptyOracleConfig();
  const oracleAccs = oracleAccounts(oracle);

  return {
    address,
    mint,
    tokenProgram,
    reserve,
    kind,
    oracleProgram,
    oracle,
    oracleAccounts: oracleAccs,
    maxCollateralPerMargin: maxCollateral,
    maxPriceAgeSecs: oracle.maxAgeSecs,
    maxConfidenceBps: oracle.maxConfidenceBps,
    liquidationBonusBps,
    ltvBps: data.readUInt16LE(112),
    liquidationThresholdBps: data.readUInt16LE(114),
    assetIndex,
    decimals,
    collateralEnabled,
    borrowEnabled,
    priceSource: oracle.klendReserve !== SYSTEM_PROGRAM_ID ? "kaminoReceipt" : "oracle",
    priceSourceAccount: oracle.klendReserve,
  };
}

// Ported from apps/solana/lib/solana/protocol-state.ts:readAllAssetConfigs
// Not offered as new farms, but the program still requires them in every health check (web kamino.ts KAMINO_RECEIPTS).
const DELISTED_KAMINO_RECEIPT_MINTS = ["9ucQp7thL38MDDTSER5ou24QnVSTZFLevDsZC1cAFkKy", "8euYpQt56z9hA2ZcFCQuWK6gAptrLcJuMZ5PtMpUwbuY"];

// Cached 60 s: protocol-level data that one action reads 5 to 10 times (each read ~0.3 to 1 s on the fork RPC).
let assetConfigCache: { at: number; map: Promise<Map<number, AssetConfigState>> } | null = null;
export function readAllAssetConfigs(): Promise<Map<number, AssetConfigState>> {
  if (assetConfigCache && Date.now() - assetConfigCache.at < 60_000) return assetConfigCache.map;
  const map = readAllAssetConfigsNow().then((m) => {
    if (!m.size) assetConfigCache = null; // a failed read is not kept
    return m;
  });
  assetConfigCache = { at: Date.now(), map };
  map.catch(() => (assetConfigCache = null));
  return map;
}
async function readAllAssetConfigsNow(): Promise<Map<number, AssetConfigState>> {
  const mints: string[] = [
    ...TOKENS.map((t) => t.mint),
    ...Object.values(KAMINO_RECEIPTS).map((r) => r.collateralMint),
    ...DELISTED_KAMINO_RECEIPT_MINTS,
    PHUSD_MINT,
    ...ALL_VAULT_MINTS,
    PHOENIX_EXCHANGE,
  ];
  const uniqueMints = Array.from(new Set(mints));
  const addresses = uniqueMints.map((m) => assetConfigPda(m));

  const allAccounts = [PRICE_BOOK, ...addresses];
  const res = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [
    allAccounts,
    { encoding: "base64" },
  ]).catch(() => null);

  const infos = res?.value ?? [];
  const bookInfo = infos[0];
  const sources = bookInfo ? decodePriceBook(Buffer.from(bookInfo.data[0], "base64")) : new Map();

  const map = new Map<number, AssetConfigState>();
  addresses.forEach((addr, i) => {
    const acc = infos[i + 1];
    if (acc) {
      const data = Buffer.from(acc.data[0], "base64");
      const asset = decodeAssetConfig(addr, data, sources);
      if (asset) map.set(asset.assetIndex, asset);
    }
  });

  return map;
}

export interface BatchContext {
  owner: string;
  margin: string;
  assetMap: Map<number, AssetConfigState>;
}

// Ported from apps/solana/lib/solana/margin.ts:loadContext
export async function loadBatchContext(owner: string): Promise<BatchContext> {
  const margin = marginPda(owner);
  const assetMap = await readAllAssetConfigs();
  return { owner, margin, assetMap };
}

/** Health accounts plus the `tokens` argument that goes with them (ALL_TOKENS, or the number of token groups listed). */
export type HealthAccounts = AccountMeta[] & { tokens: number };

// Ported from apps/solana/lib/solana/margin.ts:buildHealthRemainingAccounts
// compact: list only the token groups the account holds (or gets earlier in this transaction) and pass their count as `tokens`
// (IDL: "a smaller count lists only the first N held tokens"). Checked on the fork: the core then wants exactly N groups
// (else IncompletePositionAccounts), the excluded asset is neither listed nor counted, debt groups stay required, and leaving a
// held token out only lowers the health factor. It turns a ~60-account borrow into ~20 accounts, so the transaction fits without a
// lookup table: wallets read lookup tables from real mainnet, where the fork's table does not exist (Phantom then never returns
// the signature; Solflare refuses it).
export async function buildHealthRemainingAccounts(
  margin: string,
  exclude: { collateral?: number[]; debt?: number } = {},
  pricedMints: string[] = [],
  // pendingCollateral / pendingDebt: assets an earlier instruction in this same transaction activates (web MarginIndexModel)
  // onlyAssets (compact only): list just these held tokens. Leaving a held token out only lowers the health factor.
  opts: { extraAssetIds?: number[]; venueScan?: boolean; pendingCollateral?: number[]; pendingDebt?: number[]; pendingVenue?: number; closedVenue?: number; compact?: boolean; onlyAssets?: number[] } = {}
): Promise<HealthAccounts> {
  const protocolPda = protocolConfigPda();
  // Phoenix's oracle accounts (step 4) depend only on the margin address: with venueScan they are always needed, so they are read
  // alongside everything else instead of after it (the same reads, one fewer round trip of ~1 s on a phone).
  const phoenixEarly = opts.venueScan ? fetchPhoenixOracleAccounts(margin, opts.extraAssetIds ?? []) : null;
  const [protocolInfo, marginInfo, assetMap] = await Promise.all([
    rpc<{ value: { data: [string, string] } }>("getAccountInfo", [protocolPda, { encoding: "base64" }]),
    rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [margin, { encoding: "base64" }]),
    readAllAssetConfigs(),
  ]);

  if (!protocolInfo?.value) throw new Error("ProtocolConfig missing");
  // Price stamps (fork writes) and the vault balance read below touch different accounts: started together, both awaited
  // before the list is returned, as before.
  const pricesFresh = ensureFreshForkPrices(TOKENS, assetMap);
  pricesFresh.catch(() => {}); // awaited below
  const pBuf = Buffer.from(protocolInfo.value.data[0], "base64");
  const allowed: number[] = [];
  for (let i = 0; i < 24; i++) {
    const idx = pBuf.readUInt16LE(109 + 2 * i);
    if (idx !== EMPTY_ASSET_INDEX) allowed.push(idx);
  }

  // The program scans the protocol's token list, then this account's venue slots (web fetchMarginAccount).
  const collateralSlots: number[] = [...allowed];
  const debtSlots: number[] = new Array(24).fill(EMPTY_ASSET_INDEX);
  if (marginInfo?.value) {
    const mBuf = Buffer.from(marginInfo.value.data[0], "base64");
    for (let i = 0; i < 24; i++) {
      collateralSlots.push(mBuf.readUInt16LE(43 + 2 * i));
      debtSlots[i] = mBuf.readUInt16LE(91 + 2 * i);
    }
  }
  // A deposit into Phoenix earlier in this transaction puts the venue on the list; emptying it takes it off.
  if (opts.pendingVenue !== undefined && !collateralSlots.includes(opts.pendingVenue)) {
    const free = collateralSlots.indexOf(EMPTY_ASSET_INDEX);
    if (free !== -1) collateralSlots[free] = opts.pendingVenue;
  }
  if (opts.closedVenue !== undefined && collateralSlots.includes(opts.closedVenue)) collateralSlots[collateralSlots.indexOf(opts.closedVenue)] = EMPTY_ASSET_INDEX;
  for (const idx of opts.pendingDebt ?? []) {
    const free = debtSlots.indexOf(EMPTY_ASSET_INDEX);
    if (!debtSlots.includes(idx) && free !== -1) debtSlots[free] = idx;
  }

  // Only tokens the account actually holds need their oracle accounts; loading them all overflows the transaction.
  const held = new Set<number>(opts.pendingCollateral ?? []);
  const tokenIdx = collateralSlots.filter((i) => i !== EMPTY_ASSET_INDEX && assetMap.get(i) && assetMap.get(i)!.kind !== "venue");
  if (marginInfo?.value && tokenIdx.length) {
    const vaults = tokenIdx.map((i) => marginVault(margin, assetMap.get(i)!.mint, assetMap.get(i)!.tokenProgram));
    const res = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [vaults, { encoding: "base64" }]);
    res.value.forEach((acc, k) => {
      if (!acc) return;
      const b = Buffer.from(acc.data[0], "base64"); // SPL token account: amount is the u64 at byte 64
      if (b.length >= 72 && b.subarray(64, 72).some((x) => x !== 0)) held.add(tokenIdx[k]);
    });
  }
  await pricesFresh;

  const metas: AccountMeta[] = [];
  const oracles: string[] = [];
  let holdsVenue = false;

  // 1. Collateral groups
  const skipCol = new Set(exclude.collateral ?? []);
  const listed = new Set<number>();
  for (const idx of collateralSlots) {
    if (idx === EMPTY_ASSET_INDEX) continue;
    const asset = assetMap.get(idx);
    if (!asset) continue;

    if (asset.kind === "venue") {
      holdsVenue = true;
      if (!skipCol.has(idx)) {
        metas.push({ pubkey: asset.address, isSigner: false, isWritable: false });
        metas.push({ pubkey: margin, isSigner: false, isWritable: false });
      }
      continue;
    }

    if (held.has(idx)) oracles.push(...asset.oracleAccounts);
    if (skipCol.has(idx)) continue;
    if (opts.compact && (!held.has(idx) || listed.has(idx))) continue;
    if (opts.compact && opts.onlyAssets && !opts.onlyAssets.includes(idx)) continue;
    listed.add(idx);
    const vaultPda = marginVault(margin, asset.mint, asset.tokenProgram);
    metas.push({ pubkey: asset.address, isSigner: false, isWritable: false });
    metas.push({ pubkey: vaultPda, isSigner: false, isWritable: false });
  }

  // 2. Debt groups
  for (const idx of debtSlots) {
    if (idx === EMPTY_ASSET_INDEX) continue;
    const asset = assetMap.get(idx);
    if (!asset) continue;
    oracles.push(...asset.oracleAccounts);
    if (idx === exclude.debt) continue;
    const resPda = reservePda(asset.mint);
    const debtPda = debtPositionPda(margin, resPda);
    metas.push({ pubkey: asset.address, isSigner: false, isWritable: false });
    metas.push({ pubkey: resPda, isSigner: false, isWritable: false });
    metas.push({ pubkey: debtPda, isSigner: false, isWritable: false });
  }

  // 3. Extra priced assets
  for (const mint of pricedMints) {
    for (const a of assetMap.values()) {
      if (a.mint === mint) {
        oracles.push(...a.oracleAccounts);
        break;
      }
    }
  }

  // 4. Phoenix Venue oracles
  if (holdsVenue || opts.venueScan) {
    const phoenixAccs = await (phoenixEarly ?? fetchPhoenixOracleAccounts(margin, opts.extraAssetIds ?? []));
    oracles.push(...phoenixAccs);
  }

  // 5. Oracle segment suffix
  metas.push({ pubkey: ORACLE_PROGRAM_ID, isSigner: false, isWritable: false });
  metas.push({ pubkey: PRICE_BOOK, isSigner: false, isWritable: false });
  const seen = new Set<string>([ORACLE_PROGRAM_ID, PRICE_BOOK]);
  for (const o of oracles) {
    if (o && o !== SYSTEM_PROGRAM_ID && !seen.has(o)) {
      seen.add(o);
      metas.push({ pubkey: o, isSigner: false, isWritable: false });
    }
  }

  return Object.assign(metas, { tokens: opts.compact ? listed.size : ALL_TOKENS });
}

/**
 * Held margin tokens (asset indexes), most valuable first: the order in which narrower health lists keep them. A wallet-sized
 * transaction cannot always list every held token, and leaving one out only lowers the health factor the program computes, so a
 * narrower list leaves out the LEAST valuable tokens first. The old narrow list kept only the tokens a call moves and so left out
 * the account's SOL: a 20 USDC META-PERP open on an account at health factor ~26 was refused as "health factor too low" (fork,
 * 2026-11-18: the program priced 4.66 USDC + 20 phUSD + the Phoenix venue against 52.26 USDC of debt; the 19 SOL were not listed).
 * Values: balances x oracle prices (fetchSolanaAccount). A held token it does not price (phUSD, a Farm receipt) is not ranked and
 * is left out of every narrow list unless the call moves it.
 */
export async function heldTokensByValue(owner: string, assetMap: Map<number, AssetConfigState>): Promise<number[]> {
  const acc = await fetchSolanaAccount(owner);
  const rows = Object.entries(acc.margin?.collateral ?? {}).flatMap(([sym, b]) => {
    const mint = TOKENS.find((t) => t.symbol === sym)?.mint;
    const a = mint ? [...assetMap.values()].find((x) => x.mint === mint && x.kind !== "venue") : undefined;
    return a && b.amount > 0 ? [{ idx: a.assetIndex, usd: b.usd }] : [];
  });
  return rows.sort((x, y) => y.usd - x.usd).map((r) => r.idx);
}

/**
 * A narrowed health list (`onlyAssets`): `level` 1 leaves out the least valuable ranked token, 2 the two least valuable, and so on;
 * `keep` (what the call moves) is always listed.
 */
export function narrowHealthList(ranked: number[], keep: (number | undefined)[], level: number): number[] {
  const out = new Set(ranked.slice(Math.max(0, ranked.length - level)));
  return [...new Set([...keep.filter((x): x is number => x !== undefined), ...ranked.filter((i) => !out.has(i))])];
}

/**
 * Health-list widths for the wallet-size fallbacks, widest first: width(0) lists every held token; width(n) leaves out the n least
 * valuable held tokens (heldTokensByValue, read once and only when a narrow width is needed); null when there is no n-th token to
 * leave out (that variant is skipped). Each width maps a call's `keep` (the tokens it moves) to its `onlyAssets`.
 */
export function healthWidths(owner: string, assetMap: Map<number, AssetConfigState>) {
  let ranked: Promise<number[]> | null = null;
  return async (level: number): Promise<((keep: (number | undefined)[]) => number[] | undefined) | null> => {
    if (level === 0) return () => undefined;
    ranked ??= heldTokensByValue(owner, assetMap).catch(() => []);
    const r = await ranked;
    if (level > Math.max(1, r.length)) return null;
    return (keep) => narrowHealthList(r, keep, level);
  };
}
/** How many narrowing levels the wallet-size fallbacks try (an account rarely holds more tokens than this). */
const NARROW_LEVELS = [1, 2, 3, 4];

// ---------------------------------------------------------------------------------------------
// A) Earn: Supply & Withdraw
// ---------------------------------------------------------------------------------------------

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\lend.ts:supply
async function lendState(token: TokenInfo): Promise<{ lenderTotal: bigint; shareSupply: bigint }> {
  const [lenderTotal, supply] = await Promise.all([
    readLenderTotal(token.symbol),
    rpc<{ value: { amount: string } }>("getTokenSupply", [shareMintPda(token.mint)]),
  ]);
  return { lenderTotal, shareSupply: BigInt(supply.value.amount) };
}

export async function solanaEarnSupply(sym: string, amountUi: number | string): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const token = getToken(sym);
  const poolCfg = RESERVES[token.symbol];
  if (!poolCfg) throw new Error(`${token.symbol} has no Earn pool`);

  const assets = toRaw(amountUi, token.decimals);
  if (assets <= 0n) throw new Error("Enter an amount greater than zero");

  const [pools] = await Promise.all([fetchSolanaPools()]);
  const pool = pools.find((p) => p.sym === token.symbol);
  if (!pool) throw new Error(`Pool not found: ${token.symbol}`);

  const prefix: RawInstruction[] = [];
  const suffix: RawInstruction[] = [];
  let source = tokenAta(owner, token.mint, token.tokenProgram);

  if (token.isNative) {
    const wrap = await wrapSol(owner, assets);
    prefix.push(...wrap.instructions);
    source = wrap.ata;
    if (!wrap.existed) {
      suffix.push(splTokenCloseAccountIx(wrap.ata, owner, owner, TOKEN_PROGRAM_ID));
    }
  }

  // Prepend ATA creation for lender share account
  const shareAccount = lenderShareAccount(owner, token.mint);
  prefix.push(createAssociatedTokenAccountIdempotentIx(owner, shareAccount, owner, shareMintPda(token.mint), TOKEN_PROGRAM_ID));

  // Ported from apps/solana/lib/solana/lend.ts:supply (0.5% slippage bound on the shares received)
  const { lenderTotal, shareSupply } = await lendState(token);
  const expectedShares = shareSupply === 0n || lenderTotal === 0n ? assets : mulDivFloor(assets, shareSupply, lenderTotal);
  const bounded = (expectedShares * 9_950n) / 10_000n;
  const minShares = bounded > 0n ? bounded : 1n;

  // Instruction data: discriminator (8) + assets (u64 LE) + min_shares_out (u64 LE)
  const data = Buffer.alloc(8 + 8 + 8);
  anchorDiscriminator("lender_supply").copy(data, 0);
  data.writeBigUInt64LE(assets, 8);
  data.writeBigUInt64LE(minShares, 16);

  const ix: RawInstruction = {
    programId: VANNA_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: protocolConfigPda(), isSigner: false, isWritable: false },
      { pubkey: assetConfigPda(token.mint), isSigner: false, isWritable: false },
      { pubkey: reservePda(token.mint), isSigner: false, isWritable: true },
      { pubkey: token.mint, isSigner: false, isWritable: false },
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: reserveVault(token.mint, token.tokenProgram), isSigner: false, isWritable: true },
      { pubkey: shareMintPda(token.mint), isSigner: false, isWritable: true },
      { pubkey: shareAccount, isSigner: false, isWritable: true },
      { pubkey: token.tokenProgram, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  };

  return sendSolanaInstructions([...prefix, ix, ...suffix], {
    label: `Supply ${token.symbol}`,
    computeUnits: BATCH_COMPUTE_UNITS,
  });
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\lend.ts:redeem
export async function solanaEarnWithdraw(sym: string, amountUi?: number | string, all?: boolean): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const token = getToken(sym);
  const poolCfg = RESERVES[token.symbol];
  if (!poolCfg) throw new Error(`${token.symbol} has no Earn pool`);

  // Query lender share account balance
  const shareAccount = lenderShareAccount(owner, token.mint);
  const shareBalanceInfo = await rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [shareAccount]);
  const heldShares = BigInt(shareBalanceInfo?.value?.amount ?? "0");
  if (heldShares <= 0n) throw new Error(`You hold no v${token.symbol} shares to withdraw`);

  const { lenderTotal, shareSupply } = await lendState(token);
  let sharesToRedeem = heldShares;
  if (!all && amountUi !== undefined) {
    // Ported from apps/solana/lib/solana/lend.ts:redeem: shares worth exactly the typed amount, rounded up.
    sharesToRedeem = lenderTotal === 0n ? 0n : mulDivCeil(toRaw(amountUi, token.decimals), shareSupply, lenderTotal);
    if (sharesToRedeem > heldShares) sharesToRedeem = heldShares;
  }
  if (sharesToRedeem <= 0n) throw new Error(`No ${token.symbol} supply position to withdraw`);

  const prefix: RawInstruction[] = [];
  const suffix: RawInstruction[] = [];
  let destination = tokenAta(owner, token.mint, token.tokenProgram);

  if (token.isNative) {
    const temp = await temporaryWsolReceiver(owner);
    prefix.push(...temp.setup);
    suffix.push(...temp.cleanup);
    destination = temp.account;
  } else {
    prefix.push(createAssociatedTokenAccountIdempotentIx(owner, destination, owner, token.mint, token.tokenProgram));
  }

  const minAssets = (mulDivFloor(sharesToRedeem, lenderTotal, shareSupply) * 9_950n) / 10_000n;

  const data = Buffer.alloc(8 + 8 + 8);
  anchorDiscriminator("lender_redeem").copy(data, 0);
  data.writeBigUInt64LE(sharesToRedeem, 8);
  data.writeBigUInt64LE(minAssets, 16);

  const ix: RawInstruction = {
    programId: VANNA_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: protocolConfigPda(), isSigner: false, isWritable: false },
      { pubkey: assetConfigPda(token.mint), isSigner: false, isWritable: false },
      { pubkey: reservePda(token.mint), isSigner: false, isWritable: true },
      { pubkey: token.mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: reserveVault(token.mint, token.tokenProgram), isSigner: false, isWritable: true },
      { pubkey: shareMintPda(token.mint), isSigner: false, isWritable: true },
      { pubkey: shareAccount, isSigner: false, isWritable: true },
      { pubkey: token.tokenProgram, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  };

  return sendSolanaInstructions([...prefix, ix, ...suffix], {
    label: `Withdraw ${token.symbol}`,
    computeUnits: BATCH_COMPUTE_UNITS,
  });
}

// ---------------------------------------------------------------------------------------------
// B) Margin: Create, Deposit, Borrow, Repay, Withdraw
// ---------------------------------------------------------------------------------------------

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts:createMarginIx
export function createMarginIx(owner: string): RawInstruction {
  return {
    programId: VANNA_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: marginPda(owner), isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: anchorDiscriminator("user_create_margin"),
  };
}

export async function solanaCreateMargin(): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  return sendSolanaInstructions([createMarginIx(wallet.full)], {
    label: "Create Margin Account",
    computeUnits: 200_000,
  });
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts:depositIx
export function depositCollateralIx(owner: string, token: TokenInfo, amount: bigint, source: string): RawInstruction {
  const margin = marginPda(owner);
  const data = Buffer.alloc(8 + 8);
  anchorDiscriminator("user_deposit_collateral").copy(data, 0);
  data.writeBigUInt64LE(amount, 8);
  return {
    programId: VANNA_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: protocolConfigPda(), isSigner: false, isWritable: false },
      { pubkey: margin, isSigner: false, isWritable: true },
      { pubkey: assetConfigPda(token.mint), isSigner: false, isWritable: false },
      { pubkey: token.mint, isSigner: false, isWritable: false },
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: marginVault(margin, token.mint, token.tokenProgram), isSigner: false, isWritable: true },
      { pubkey: token.tokenProgram, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  };
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts:borrowIx
export function borrowIx(
  owner: string,
  token: TokenInfo,
  amount: bigint,
  maxDebtShares: bigint,
  remainingAccounts: AccountMeta[] | HealthAccounts
): RawInstruction {
  const margin = marginPda(owner);
  const reserve = reservePda(token.mint);
  const data = Buffer.alloc(8 + 8 + 16 + 1);
  anchorDiscriminator("user_borrow").copy(data, 0);
  data.writeBigUInt64LE(amount, 8);
  data.writeBigUInt64LE(maxDebtShares & 0xffffffffffffffffn, 16);
  data.writeBigUInt64LE(maxDebtShares >> 64n, 24);
  data.writeUInt8(tokensArg(remainingAccounts), 32);

  return {
    programId: VANNA_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: protocolConfigPda(), isSigner: false, isWritable: false },
      { pubkey: margin, isSigner: false, isWritable: true },
      { pubkey: assetConfigPda(token.mint), isSigner: false, isWritable: false },
      { pubkey: reserve, isSigner: false, isWritable: true },
      { pubkey: debtPositionPda(margin, reserve), isSigner: false, isWritable: true },
      { pubkey: token.mint, isSigner: false, isWritable: false },
      { pubkey: reserveVault(token.mint, token.tokenProgram), isSigner: false, isWritable: true },
      { pubkey: marginVault(margin, token.mint, token.tokenProgram), isSigner: false, isWritable: true },
      { pubkey: token.tokenProgram, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      ...remainingAccounts,
    ],
    data,
  };
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts:solanaDepositAndBorrow
export async function solanaDepositAndBorrow(params: {
  deposits?: { sym: string; amount: number | string }[];
  borrows?: { sym: string; amount: number | string }[];
  createIfMissing?: boolean;
}): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const margin = marginPda(owner);

  // Check if margin account exists
  const marginAccountInfo = await rpc<{ value: unknown }>("getAccountInfo", [margin, { encoding: "base64" }]);
  const create = !marginAccountInfo?.value;
  if (create && params.createIfMissing === false) throw new Error("Margin account does not exist. Create margin account first.");

  type Leg = { sym: string; amount: number | string };
  const positive = (l: Leg) => toRaw(l.amount, getToken(l.sym).decimals) > 0n;
  const deposits = (params.deposits ?? []).filter(positive);
  const borrows = (params.borrows ?? []).filter(positive);
  const configs = await readAllAssetConfigs();
  const indexOf = (sym: string) => [...configs.values()].find((c) => c.mint === getToken(sym).mint)?.assetIndex;

  // The instructions for one transaction. `earlier`: deposits / borrows already confirmed by an earlier transaction of this
  // action, counted as pending in case the RPC still returns the account as it was.
  const build = async (deps: Leg[], bors: Leg[], withCreate: boolean, earlier: { deposits: Leg[]; borrows: Leg[] } = { deposits: [], borrows: [] }) => {
    const instructions: RawInstruction[] = [];
    const suffix: RawInstruction[] = [];
    if (withCreate) instructions.push(createMarginIx(owner));

    for (const dep of deps) {
      const token = getToken(dep.sym);
      const amountRaw = toRaw(dep.amount, token.decimals);
      let source = tokenAta(owner, token.mint, token.tokenProgram);
      if (token.isNative) {
        const wrap = await wrapSol(owner, amountRaw);
        instructions.push(...wrap.instructions);
        source = wrap.ata;
        if (!wrap.existed) suffix.push(splTokenCloseAccountIx(wrap.ata, owner, owner, TOKEN_PROGRAM_ID));
      }
      instructions.push(depositCollateralIx(owner, token, amountRaw, source));
    }

    const idx = (legs: Leg[]) => legs.flatMap((l) => (indexOf(l.sym) !== undefined ? [indexOf(l.sym)!] : []));
    const pendingDebt: number[] = idx(earlier.borrows);
    const pendingCollateral: number[] = idx([...earlier.deposits, ...earlier.borrows, ...deps]);
    for (const bor of bors) {
      const token = getToken(bor.sym);
      const amountRaw = toRaw(bor.amount, token.decimals);
      // max debt shares bound (1.05x buffer)
      const maxDebtShares = (amountRaw * 105n) / 100n;
      const assetIndex = indexOf(bor.sym);
      const remaining = await buildHealthRemainingAccounts(
        margin,
        assetIndex !== undefined ? { collateral: [assetIndex], debt: assetIndex } : {},
        [token.mint],
        { pendingCollateral: [...pendingCollateral], pendingDebt: [...pendingDebt], compact: true }
      );
      instructions.push(borrowIx(owner, token, amountRaw, maxDebtShares, remaining));
      if (assetIndex !== undefined) {
        pendingDebt.push(assetIndex);
        pendingCollateral.push(assetIndex);
      }
    }
    return [...instructions, ...suffix];
  };
  // Wallet-safe lookup tables only (MARGIN_WALLET_TABLES): a borrow lists the Phoenix venue's oracles when the account trades
  // Perps, and without a table it no longer fit (1,330 B for a 1 USDC borrow, fork 2026-11-19), so it fell back to the fork-only
  // table, which Phantom cannot resolve. With the mainnet tables: 933 B.
  const send = (ixs: RawInstruction[], label: string) => sendMarginWalletSafe(owner, ixs, label);
  const fits = async (ixs: RawInstruction[]) => (await walletTablesFor(ixs, owner, MARGIN_WALLET_TABLES)).size <= MAX_TX_BYTES;

  // One transaction (one approval) whenever it fits (1 SOL deposit + 1 borrow: ~980 bytes).
  const all = await build(deposits, borrows, create);
  if ((await fits(all)) || deposits.length + borrows.length <= 1) return await send(all, "Deposit and Borrow");

  // Otherwise several transactions, each without a lookup table, built now and signed in ONE wallet request (one approval):
  // the account and deposits first, then each borrow (built with the earlier parts counted as pending), sent in order.
  // If a later part fails, what landed is safe on its own: an open account and deposited collateral, or fewer borrows.
  const parts: BatchPart[] = [];
  const done: { deposits: Leg[]; borrows: Leg[] } = { deposits: [], borrows: [] };
  if (create || deposits.length) {
    const first = await build(deposits, [], create);
    if ((await fits(first)) || deposits.length <= 1) {
      parts.push({ instructions: first, label: deposits.length ? "Deposit" : "Open margin account", before: freshenForkPrices });
    } else {
      if (create) parts.push({ instructions: await build([], [], true), label: "Open margin account", before: freshenForkPrices });
      for (const dep of deposits) {
        parts.push({ instructions: await build([dep], [], false, done), label: `Deposit ${dep.sym}`, before: freshenForkPrices });
        done.deposits.push(dep);
      }
    }
    done.deposits = deposits;
  }
  for (const bor of borrows) {
    parts.push({ instructions: await build([], [bor], false, done), label: `Borrow ${bor.sym}`, before: freshenForkPrices });
    done.borrows.push(bor);
  }
  const fitted = await fitWalletParts(owner, MARGIN_WALLET_TABLES, parts);
  if (typeof fitted === "number") throw new WalletTxTooLargeError(fitted, "Deposit and Borrow");
  try {
    return await sendSolanaBatch(fitted, { computeUnits: EXEC_COMPUTE_UNITS });
  } catch (e) {
    if (e instanceof BatchPartError) {
      const landed = parts.slice(0, e.failedIndex).map((p) => p.label.toLowerCase()).join(", ");
      throw new Error(`${e.failedLabel} did not go through: ${e.message}. Already done and safe in your margin account: ${landed}. Try the rest again.`);
    }
    throw e;
  }
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts:repayFromMarginIx
export function repayFromMarginIx(owner: string, token: TokenInfo, maxAssets: bigint, repayAll: boolean): RawInstruction {
  const margin = marginPda(owner);
  const reserve = reservePda(token.mint);
  const data = Buffer.alloc(8 + 8 + 1);
  anchorDiscriminator("user_repay_from_margin").copy(data, 0);
  data.writeBigUInt64LE(maxAssets, 8);
  data.writeUInt8(repayAll ? 1 : 0, 16);

  return {
    programId: VANNA_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: margin, isSigner: false, isWritable: true },
      { pubkey: assetConfigPda(token.mint), isSigner: false, isWritable: false },
      { pubkey: reserve, isSigner: false, isWritable: true },
      { pubkey: debtPositionPda(margin, reserve), isSigner: false, isWritable: true },
      { pubkey: token.mint, isSigner: false, isWritable: false },
      { pubkey: marginVault(margin, token.mint, token.tokenProgram), isSigner: false, isWritable: true },
      { pubkey: reserveVault(token.mint, token.tokenProgram), isSigner: false, isWritable: true },
      { pubkey: token.tokenProgram, isSigner: false, isWritable: false },
    ],
    data,
  };
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts:reclaimRentIx
export function reclaimRentIx(owner: string, token: TokenInfo): RawInstruction {
  const margin = marginPda(owner);
  const reserve = reservePda(token.mint);
  return {
    programId: VANNA_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: margin, isSigner: false, isWritable: false },
      { pubkey: assetConfigPda(token.mint), isSigner: false, isWritable: false },
      { pubkey: token.mint, isSigner: false, isWritable: false },
      { pubkey: VANNA_PROGRAM_ID, isSigner: false, isWritable: false }, // vault stays open: it may still hold collateral (web reclaimRentIx { debt: true })
      { pubkey: debtPositionPda(margin, reserve), isSigner: false, isWritable: true },
      { pubkey: token.tokenProgram, isSigner: false, isWritable: false },
    ],
    data: anchorDiscriminator("user_reclaim_rent"),
  };
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts:repay
export async function solanaRepay(params: {
  sym: string;
  amount?: number | string;
  all?: boolean;
  source?: "wallet" | "margin";
}): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const token = getToken(params.sym);

  const instructions: RawInstruction[] = [];
  const suffix: RawInstruction[] = [];

  // Ported from apps/solana/lib/solana/margin.ts:repay. Paying off the whole debt sends 0.2% extra because interest
  // keeps accruing until the transaction lands; what isn't used stays in the margin account as collateral.
  const account = await fetchSolanaAccount(owner);
  const debtRaw = BigInt(Math.ceil((account.margin?.debt[token.symbol]?.amount ?? 0) * 10 ** token.decimals));
  if (debtRaw <= 0n) throw new Error(`No ${token.symbol} debt to repay`);
  const requested = params.all ? debtRaw : toRaw(params.amount ?? 0, token.decimals);
  if (requested <= 0n) throw new Error("Enter an amount greater than zero");
  const target = requested > debtRaw ? debtRaw : requested;
  const repayAll = Boolean(params.all) || target >= debtRaw;
  const needed = repayAll ? target + (target * 20n) / 10_000n + 1n : target;

  if (params.source === "wallet") {
    let walletSource = tokenAta(owner, token.mint, token.tokenProgram);
    if (token.isNative) {
      const wrap = await wrapSol(owner, needed);
      instructions.push(...wrap.instructions);
      walletSource = wrap.ata;
      if (!wrap.existed) suffix.push(splTokenCloseAccountIx(wrap.ata, owner, owner, TOKEN_PROGRAM_ID));
    }
    instructions.push(depositCollateralIx(owner, token, needed, walletSource));
  } else {
    const inVault = BigInt(Math.floor((account.margin?.collateral[token.symbol]?.amount ?? 0) * 10 ** token.decimals));
    if (inVault < needed) throw new Error(`Your margin account holds ${fromRaw(inVault, token.decimals)} ${token.symbol}, less than the ${fromRaw(needed, token.decimals)} needed. Repay from wallet or deposit more first.`);
  }

  instructions.push(repayFromMarginIx(owner, token, target, repayAll));
  if (repayAll) instructions.push(reclaimRentIx(owner, token));

  return sendSolanaInstructions([...instructions, ...suffix], {
    label: `Repay ${token.symbol}`,
    computeUnits: BATCH_COMPUTE_UNITS,
  });
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts:withdrawIx
export function withdrawCollateralIx(
  owner: string,
  token: TokenInfo,
  amount: bigint,
  minHealthFactorWad: bigint,
  destination: string,
  remainingAccounts: AccountMeta[] | HealthAccounts = []
): RawInstruction {
  const margin = marginPda(owner);
  const data = Buffer.alloc(8 + 8 + 16 + 1);
  anchorDiscriminator("user_withdraw_collateral").copy(data, 0);
  data.writeBigUInt64LE(amount, 8);
  data.writeBigUInt64LE(minHealthFactorWad & 0xffffffffffffffffn, 16);
  data.writeBigUInt64LE(minHealthFactorWad >> 64n, 24);
  data.writeUInt8(tokensArg(remainingAccounts), 32);

  return {
    programId: VANNA_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: protocolConfigPda(), isSigner: false, isWritable: false },
      { pubkey: margin, isSigner: false, isWritable: true },
      { pubkey: assetConfigPda(token.mint), isSigner: false, isWritable: false },
      { pubkey: token.mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: marginVault(margin, token.mint, token.tokenProgram), isSigner: false, isWritable: true },
      { pubkey: token.tokenProgram, isSigner: false, isWritable: false },
      ...remainingAccounts,
    ],
    data,
  };
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts:withdrawCollateral
export async function solanaWithdrawCollateral(params: {
  sym: string;
  amount?: number | string;
  all?: boolean;
}): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const token = getToken(params.sym);
  const margin = marginPda(owner);

  // Check margin vault balance
  const vault = marginVault(margin, token.mint, token.tokenProgram);
  const bal = await rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [vault]);
  const held = BigInt(bal?.value?.amount ?? "0");
  if (held <= 0n) throw new Error(`Margin vault has no ${token.symbol} collateral`);

  const amount = params.all ? held : toRaw(params.amount ?? 0, token.decimals);
  if (amount <= 0n) throw new Error("Enter an amount to withdraw");
  if (amount > held) throw new Error(`Margin vault holds only ${fromRaw(held, token.decimals)} ${token.symbol}`);

  const prefix: RawInstruction[] = [];
  const suffix: RawInstruction[] = [];
  let destination = tokenAta(owner, token.mint, token.tokenProgram);

  if (token.isNative) {
    const temp = await temporaryWsolReceiver(owner);
    prefix.push(...temp.setup);
    suffix.push(...temp.cleanup);
    destination = temp.account;
  } else {
    prefix.push(createAssociatedTokenAccountIdempotentIx(owner, destination, owner, token.mint, token.tokenProgram));
  }

  // Minimum required health factor (1.10 strict law)
  const minHfWad = 1_100_000_000_000_000_000n; // 1.10 WAD
  const assetMap = await readAllAssetConfigs();
  const asset = [...assetMap.values()].find((a) => a.mint === token.mint);
  // No debt means no health check, so no remaining accounts (web margin.ts withdraw).
  const marginInfo = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [margin, { encoding: "base64" }]);
  const mBuf = marginInfo?.value ? Buffer.from(marginInfo.value.data[0], "base64") : null;
  const hasDebt = !!mBuf && Array.from({ length: 24 }, (_, i) => mBuf.readUInt16LE(91 + 2 * i)).some((d) => d !== EMPTY_ASSET_INDEX);
  const remaining = hasDebt
    ? await buildHealthRemainingAccounts(margin, asset ? { collateral: [asset.assetIndex] } : { collateral: [] }, [token.mint], { compact: true })
    : [];

  const ix = withdrawCollateralIx(owner, token, amount, minHfWad, destination, remaining);

  // Wallet-safe tables only (see solanaDepositAndBorrow): 1,456 B without a table for 0.1 SOL on an account that trades Perps.
  return sendMarginWalletSafe(owner, [...prefix, ix, ...suffix], `Withdraw ${token.symbol} Collateral`);
}

/**
 * Sends a margin borrow / withdraw (a health-checked core instruction) with mainnet lookup tables only, so the wallet can resolve
 * every table; never the fork-only table (Phantom takes the approval and never answers). Too large: WalletTxTooLargeError
 * before signing.
 */
async function sendMarginWalletSafe(owner: string, ixs: RawInstruction[], label: string): Promise<string> {
  const { addresses } = await walletTablesFor(ixs, owner, MARGIN_WALLET_TABLES);
  return sendSolanaInstructions(ixs, { label, computeUnits: EXEC_COMPUTE_UNITS, walletSafe: true, lookupTableAddresses: addresses });
}

// ---------------------------------------------------------------------------------------------
// C) margin_execute Wrapper for External Programs
// ---------------------------------------------------------------------------------------------

// Public lookup tables on REAL mainnet that hold the fixed accounts of each integration (found 2026-11-18 from mainnet
// transactions of Kamino's main market, Perena and Ember/Phoenix). Wallets resolve tables on mainnet, so only such tables may be
// used; walletSafeLookupTables still checks each one (the fork copy must equal the start of the mainnet table) before use.
// They hold Kamino's reserves and vaults, Perena's vault accounts, Ember/Phoenix accounts, mints, token programs and Pyth feeds:
// enough to bring one margin_execute (about 1,300 to 1,400 bytes alone) under 1,232. Vanna's own accounts are not in any of them.
export const KAMINO_MAINNET_TABLES = ["284iwGtA9X9aLy3KsyV8uT2pXLARhYbiSi5SiM2g47M2", "FGMSBiyVE8TvZcdQnZETAAKw28tkQJ2ccZy6pyp95URb"];
export const PERENA_MAINNET_TABLES = ["4ZP1hmYuePwAwmr2uHvjRL12okdG2krf4A9sacSxvHcs", "3hi1c3L11vL446LJotFZNXHp1YZSLQ867SeQJUc9b5t1", "bzdjSeDDPEdsGpK73oevQ87x4Sm6QRsnzupPLQEaFFN"];
export const PHOENIX_MAINNET_TABLES = ["BnouXqk6UVhXXESoMY6UxHXrSzXYaqP7xokguFaCfJXu", "bzdjSeDDPEdsGpK73oevQ87x4Sm6QRsnzupPLQEaFFN", "4ZP1hmYuePwAwmr2uHvjRL12okdG2krf4A9sacSxvHcs"];

/**
 * The wallet-safe tables (up to 6, picked greedily from `candidates`) that make these instructions smallest, and the size then.
 * Size is measured as sendSolanaInstructions builds it (compute budget and durable nonce included).
 */
export async function walletTablesFor(ixs: RawInstruction[], owner: string, candidates: string[]): Promise<{ addresses: string[]; size: number }> {
  const safe = await walletSafeLookupTables(candidates, owner);
  const chosen: AddressLookupTableAccount[] = [];
  let size = txSizeWithoutLookupTable(ixs, owner, EXEC_COMPUTE_UNITS, chosen);
  for (let round = 0; round < 6; round++) {
    let pick: AddressLookupTableAccount | null = null;
    for (const t of safe) {
      if (chosen.includes(t)) continue;
      const s = txSizeWithoutLookupTable(ixs, owner, EXEC_COMPUTE_UNITS, [...chosen, t]);
      if (s < size) {
        size = s;
        pick = t;
      }
    }
    if (!pick) break;
    chosen.push(pick);
  }
  return { addresses: chosen.map((t) => t.address), size };
}

/** Only the create-account instructions whose account does not exist yet (each one saves ~70 bytes when skipped). */
async function missingAtaIxs(owner: string, wanted: { account: string; wallet: string; mint: string; tokenProgram: string }[]): Promise<RawInstruction[]> {
  if (!wanted.length) return [];
  const res = await rpc<{ value: (unknown | null)[] }>("getMultipleAccounts", [wanted.map((w) => w.account), { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]);
  return wanted.filter((_, i) => !res.value[i]).map((w) => createAssociatedTokenAccountIdempotentIx(owner, w.account, w.wallet, w.mint, w.tokenProgram));
}

/** A transaction part before sizing; `tables` replaces the operation's candidate tables for this part (e.g. a swap route's own). */
export type WalletPart = { instructions: RawInstruction[]; label: string; tables?: string[]; before?: (retry: boolean) => Promise<void> };

/** FORK ONLY: re-stamps the token price accounts right before a signed transaction is sent (a slow approval ages them). */
export const freshenForkPrices = async (retry = false): Promise<void> => ensureFreshForkPrices(TOKENS, await readAllAssetConfigs(), [], retry);

/**
 * Wallet-safe tables for each part. Returns the batch when every part fits 1,232 bytes, else the size of the first part that
 * does not fit (nothing is signed).
 */
async function fitWalletParts(owner: string, candidates: string[], parts: WalletPart[]): Promise<BatchPart[] | number> {
  const sized = await Promise.all(parts.map(async (p) => ({ ...p, ...(await walletTablesFor(p.instructions, owner, p.tables ?? candidates)) })));
  const over = sized.find((p) => p.size > MAX_TX_BYTES);
  if (over) return over.size;
  return sized.map((p) => ({ instructions: p.instructions, label: p.label, lookupTableAddresses: p.addresses, before: p.before ?? freshenForkPrices }));
}

/**
 * The parts to try for "setup + one big call": everything in one transaction, else the setup (account creation) first and the
 * call alone, signed together. Setup that lands alone only creates empty token accounts the margin account owns: harmless.
 */
function setupSplits(setup: RawInstruction[], call: RawInstruction, label: string, tables?: string[]): WalletPart[][] {
  const one: WalletPart[] = [{ instructions: [...setup, call], label, tables }];
  if (!setup.length) return [one];
  return [one, [{ instructions: setup, label: `${label}: prepare accounts`, tables }, { instructions: [call], label, tables }]];
}

// Mainnet tables that hold accounts every margin call lists (token programs, common mints, Pyth price feeds): extra candidates
// for any margin_execute, on top of an integration's or a swap route's own tables.
export const COMMON_MAINNET_TABLES = [...new Set([KAMINO_MAINNET_TABLES[0], ...PERENA_MAINNET_TABLES, ...PHOENIX_MAINNET_TABLES])];
// Every health list names the Phoenix venue's oracle accounts once the account trades Perps; the Phoenix tables hold them. With
// them, the full health list fits again (user's account, 4 markets open, fork 2026-11-19): Kamino deposit 1,330 -> 1,116 B,
// Perena deposit 1,346 -> 1,194 B, borrow 1,330 -> 933 B, withdraw 0.1 SOL 1,456 -> 1,121 B.
const KAMINO_WALLET_TABLES = [...new Set([...KAMINO_MAINNET_TABLES, ...COMMON_MAINNET_TABLES])];
const PERENA_WALLET_TABLES = [...new Set([...PERENA_MAINNET_TABLES, ...COMMON_MAINNET_TABLES])];
const MARGIN_WALLET_TABLES = COMMON_MAINNET_TABLES;

/**
 * The pre-send check failed on health while a narrowed health list left part of the collateral out (the full list did not fit a
 * wallet transaction): says so instead of "reduce the amount", which may not be the cause. Anything else is returned unchanged.
 */
function omittedHealthError(e: unknown, label: string): unknown {
  if (!(e instanceof BatchPartError) && e instanceof Error && /health factor to or below/.test(e.message)) {
    return new Error(`${label}: the health check failed with part of your collateral left out (a wallet transaction cannot list all of it for this action). Nothing was signed or sent.`);
  }
  return e;
}

/**
 * Sends a Farm / Perps operation with ONE wallet approval and no fork-only lookup table. `variants` builds the transaction parts
 * from the widest health list to the narrowest (leaving a held token out of the health list only makes the check stricter); the
 * first variant whose every part fits 1,232 bytes with wallet-safe tables is used. Several parts are signed together
 * (sendSolanaBatch: one sign_transactions request) and sent in order.
 */
async function sendWalletParts(
  owner: string,
  candidates: string[],
  // `check`: a whole-batch check run before the wallet is asked (see sendSolanaBatch). `omits`: this variant leaves held tokens out
  // of the health list. A variant that resolves to null is skipped (no such narrowing for this account).
  // `independent`: no part depends on another (Close all), so they are checked, sent and confirmed together, with `refreshAll`
  // refreshing every part's market data in one pass (see sendSolanaBatch).
  variants: (() => Promise<{ parts: WalletPart[]; check?: () => Promise<void>; omits?: boolean; independent?: boolean; refreshAll?: (retry: boolean) => Promise<void> } | null>)[],
  label: string,
  // onLeg / cancel / stop (submit.ts BatchControl), passed to sendSolanaBatch.
  control: BatchControl = {},
): Promise<string> {
  let biggest = 0;
  const t0 = Date.now();
  const mark = (what: string) => {
    if (__DEV__) console.log(`[open-time] +${((Date.now() - t0) / 1000).toFixed(1)}s (parts) ${what}`);
  };
  for (const [n, build] of variants.entries()) {
    const built = await build();
    if (!built) continue;
    const { parts, check, omits, independent, refreshAll } = built;
    mark(`variant ${n + 1} built, ${parts.length} part(s)`);
    const fit = await fitWalletParts(owner, candidates, parts);
    mark(`variant ${n + 1} ${typeof fit === "number" ? `too large (${fit} B)` : "fits"}`);
    if (typeof fit === "number") {
      biggest = fit;
      continue;
    }
    try {
      return await sendSolanaBatch(fit, { computeUnits: EXEC_COMPUTE_UNITS, independent, refreshAll, ...control }, check);
    } catch (e) {
      // The checks before signing failed on health with part of the collateral left out of the list (see omittedHealthError).
      throw omits ? omittedHealthError(e, label) : e;
    }
  }
  throw new WalletTxTooLargeError(biggest, label);
}

// Programs whose margin_execute calls carry the validator rule book (Kamino Lend, Titan, Perena).
const RULE_PROGRAMS = ["KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD", "T1TANpTeScyeqVzzgNViGDNrkQ6qHz9KrSBS4aNXvGT", "save8RQVPMWNTzU18t3GBvBkN9hT7jsGjiCQ28FpD9H"];

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\exec.ts:marginExecuteIx
export async function marginExecuteIx(
  owner: string,
  targetProgram: string,
  cpiData: Buffer,
  cpiAccounts: AccountMeta[],
  venueAsset: string | null = null,
  validatorAccounts: AccountMeta[] = [],
  pricedMints: string[] = [],
  healthOpts: { extraAssetIds?: number[]; venueScan?: boolean; pendingDebt?: number[]; pendingCollateral?: number[]; pendingVenue?: number; closedVenue?: number; compact?: boolean; onlyAssets?: number[] } = {}
): Promise<RawInstruction> {
  const margin = marginPda(owner);
  const remaining = await buildHealthRemainingAccounts(margin, {}, pricedMints, {
    ...healthOpts,
    venueScan: healthOpts.venueScan ?? Boolean(venueAsset),
  });

  // Discriminator: sha256("global:margin_execute")[0..8]
  // Args: data (Vec<u8>: u32 LE len + bytes), call_account_count (u16 LE), tokens (u8 = ALL_TOKENS)
  const disc = anchorDiscriminator("margin_execute");
  const dataLen = cpiData.length;
  const data = Buffer.alloc(8 + 4 + dataLen + 2 + 1);
  let o = 0;
  disc.copy(data, o); o += 8;
  data.writeUInt32LE(dataLen, o); o += 4;
  cpiData.copy(data, o); o += dataLen;
  data.writeUInt16LE(cpiAccounts.length, o); o += 2;
  data.writeUInt8(tokensArg(remaining), o); // ALL_TOKENS, or the compact count (healthOpts.compact)

  const eventAuthority = findPda(["__event_authority"], VANNA_PROGRAM_ID);
  // Kamino Lend, Titan and Perena are reviewed from the validator's on-chain rule book, passed after the health accounts
  // (backend exec.ts RULE_PROGRAMS / ruleBookPda, round-2 contract update). Without it the validator answers "No rules for this program".
  const extras: AccountMeta[] = validatorAccounts.length > 0
    ? validatorAccounts
    : RULE_PROGRAMS.includes(targetProgram)
      ? [{ pubkey: findPda(["rules", decode58(targetProgram)], VALIDATOR_PROGRAM_ID), isSigner: false, isWritable: false }]
      : [];
  const validatorSegment: AccountMeta[] = extras.length > 0
    ? [{ pubkey: VALIDATOR_PROGRAM_ID, isSigner: false, isWritable: false }, ...extras]
    : [];

  return {
    programId: VANNA_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: protocolConfigPda(), isSigner: false, isWritable: false },
      { pubkey: margin, isSigner: false, isWritable: true },
      { pubkey: integrationPda(targetProgram), isSigner: false, isWritable: false },
      { pubkey: targetProgram, isSigner: false, isWritable: false },
      { pubkey: VALIDATOR_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: venueAsset ?? VANNA_PROGRAM_ID, isSigner: false, isWritable: false }, // Anchor's "none": the program's own id
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: VANNA_PROGRAM_ID, isSigner: false, isWritable: false },
      // Remaining accounts: CPI accounts (non-signers) + health accounts + validator accounts
      ...cpiAccounts.map((a) => ({ ...a, isSigner: false })),
      ...remaining,
      ...validatorSegment,
    ],
    data,
  };
}

// ---------------------------------------------------------------------------------------------
// D) Spot Swap: Jupiter Wallet Swap & Margin Swap
// ---------------------------------------------------------------------------------------------

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\swap.ts:executeWalletSwap
// Ported from apps/solana/app/api/solana/jupiter/quote/route.ts:FORK_DEXES: pool AMMs that behave on a fork.
const JUPITER_FORK_DEXES = encodeURIComponent("Raydium,Raydium CLMM,Raydium CP,Orca V2,Meteora DLMM,Whirlpool");

export async function solanaWalletSwap(params: {
  fromSym: string;
  toSym: string;
  amount: number | string;
  slippageBps?: number;
}): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const fromToken = getToken(params.fromSym);
  const toToken = getToken(params.toSym);
  const rawIn = toRaw(params.amount, fromToken.decimals);
  const slippage = params.slippageBps ?? 50;

  const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${fromToken.mint}&outputMint=${toToken.mint}&amount=${rawIn}&slippageBps=${slippage}&dexes=${JUPITER_FORK_DEXES}`;
  const quoteRes = await fetch(quoteUrl);
  if (!quoteRes.ok) throw new Error(`Jupiter quote failed: ${quoteRes.statusText}`);
  const quoteData = await quoteRes.json();

  const swapRes = await fetch("https://lite-api.jup.ag/swap/v1/swap-instructions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quoteData,
      userPublicKey: owner,
      wrapAndUnwrapSol: true,
      useSharedAccounts: true,
    }),
  });
  if (!swapRes.ok) throw new Error(`Jupiter swap instructions failed: ${swapRes.statusText}`);
  const swapData = await swapRes.json();

  const parseIx = (ix: { programId: string; accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[]; data: string }): RawInstruction => ({
    programId: ix.programId,
    keys: ix.accounts,
    data: Buffer.from(ix.data, "base64"),
  });

  const instructions: RawInstruction[] = [];
  if (swapData.setupInstructions) instructions.push(...swapData.setupInstructions.map(parseIx));
  if (swapData.swapInstruction) instructions.push(parseIx(swapData.swapInstruction));
  if (swapData.cleanupInstruction) instructions.push(parseIx(swapData.cleanupInstruction));

  return sendSolanaInstructions(instructions, {
    label: `Swap ${fromToken.symbol} → ${toToken.symbol}`,
    computeUnits: EXEC_COMPUTE_UNITS,
    lookupTableAddresses: swapData.addressLookupTableAddresses ?? [],
  });
}

/** Shown when no swap route fits one transaction that an external wallet can resolve. */
export const SWAP_TOO_LARGE_MESSAGE = "This pair is too large for the wallet right now, try a smaller route";

// Jupiter routes tried for a margin swap, best price first; the next one only when the previous does not fit. `route` (not
// shared accounts) needs 4 fewer accounts (~100 bytes); the validator allows both (backend SOLANA_CONTRACT_REFERENCE.md).
const JUPITER_MARGIN_ROUTES: { query: string; shared: boolean }[] = [
  { query: "maxAccounts=20", shared: false },
  { query: "maxAccounts=16", shared: false },
  { query: "maxAccounts=12", shared: false },
  { query: "onlyDirectRoutes=true", shared: false },
  { query: "maxAccounts=16", shared: true },
];

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\exec.ts:executeMarginSwap
// The wallet signs this, and wallets resolve lookup tables on REAL mainnet: a fork-only table (writeForkLookupTable) made Phantom
// take the approval and never answer (2026-11-17, SOL -> USDC with table HdoyXn...). So only route tables that are identical on
// mainnet are used (walletSafe), the health accounts are compact, and when a route does not fit, a route with fewer accounts is
// tried; if none fits, the swap stops before signing with SWAP_TOO_LARGE_MESSAGE.
export async function solanaMarginSwap(params: {
  fromSym: string;
  toSym: string;
  amount: number | string;
  slippageBps?: number;
  /** Swap venue picked on the Spot screen (default Jupiter). */
  venue?: "jupiter" | "titan";
  /** onLeg / cancel / stop (submit.ts BatchControl). */
  control?: BatchControl;
}): Promise<string> {
  if (params.venue === "titan") return solanaMarginTitanSwap(params);
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const margin = marginPda(owner);
  const fromToken = getToken(params.fromSym);
  const toToken = getToken(params.toSym);
  const rawIn = toRaw(params.amount, fromToken.decimals);
  const slippage = params.slippageBps ?? 50;

  // The receiving margin vault: created in the same transaction only when it does not exist yet (saves ~40 bytes otherwise).
  const receivedVault = marginVault(margin, toToken.mint, toToken.tokenProgram);
  const [vaultInfo, configs] = await Promise.all([
    rpc<{ value: unknown }>("getAccountInfo", [receivedVault, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]),
    readAllAssetConfigs(),
  ]);
  const setup = vaultInfo.value ? [] : [createAssociatedTokenAccountIdempotentIx(owner, receivedVault, margin, toToken.mint, toToken.tokenProgram)];
  const received = [...configs.values()].find((c) => c.mint === toToken.mint && c.kind !== "venue");

  const sent = [...configs.values()].find((c) => c.mint === fromToken.mint && c.kind !== "venue");
  const label = `Margin Swap ${fromToken.symbol} → ${toToken.symbol}`;

  // Each route is tried as one transaction, then as two signed together (create the received vault, then the swap). Tables: the
  // route's own plus COMMON_MAINNET_TABLES, all checked wallet-safe.
  type Candidate = { data: Buffer; accounts: AccountMeta[]; tables: string[] };
  const candidates: Candidate[] = [];
  const tried = new Set<string>();
  const tryCandidate = async (c: Candidate, onlyAssets?: number[]) => {
    const execIx = await marginExecuteIx(owner, JUPITER_V6_PROGRAM_ID, c.data, c.accounts, null, [], [fromToken.mint, toToken.mint], {
      compact: true,
      pendingCollateral: received ? [received.assetIndex] : [],
      onlyAssets,
    });
    for (const parts of setupSplits(setup, execIx, label, c.tables)) {
      const fit = await fitWalletParts(owner, c.tables, parts);
      if (typeof fit !== "number") return fit;
    }
    return null;
  };
  for (const route of JUPITER_MARGIN_ROUTES) {
    const quoteRes = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${fromToken.mint}&outputMint=${toToken.mint}&amount=${rawIn}&slippageBps=${slippage}&dexes=${JUPITER_FORK_DEXES}&${route.query}`);
    if (!quoteRes.ok) continue;
    const quoteData = await quoteRes.json();
    if (!Array.isArray(quoteData?.routePlan)) continue;
    const key = `${route.shared}:${quoteData.routePlan.map((r: { swapInfo?: { ammKey?: string } }) => r.swapInfo?.ammKey).join(">")}`;
    if (tried.has(key)) continue; // the same route as a candidate already measured
    tried.add(key);

    const swapRes = await fetch("https://lite-api.jup.ag/swap/v1/swap-instructions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteResponse: quoteData, userPublicKey: margin, wrapAndUnwrapSol: false, useSharedAccounts: route.shared }),
    });
    if (!swapRes.ok) continue;
    const swapData = await swapRes.json();
    const swapIx: { data: string; accounts: { pubkey: string; isWritable: boolean }[] } | undefined = swapData.swapInstruction;
    if (!swapIx) continue;
    const candidate: Candidate = {
      data: Buffer.from(swapIx.data, "base64"),
      accounts: swapIx.accounts.map((a) => ({ pubkey: a.pubkey, isSigner: false, isWritable: a.isWritable })),
      tables: [...new Set([...(swapData.addressLookupTableAddresses ?? []), ...COMMON_MAINNET_TABLES])],
    };
    candidates.push(candidate);
    // Compact health accounts (held token groups plus the received token): checked on the fork 2026-11-17.
    const batch = await tryCandidate(candidate);
    if (batch) return swapBatch(batch, toToken.symbol, params.control);
  }
  if (!candidates.length) throw new Error("Jupiter has no route for this pair right now");

  // No route fits with every held token listed: leave out the LEAST valuable held tokens first (healthWidths), always keeping the
  // two swapped tokens (debts always stay listed). The core counts less collateral, so the check can only be stricter. The old
  // fallback listed only the two swapped tokens and so left out the account's SOL: a 5 USDC -> USDT swap on an account at health
  // factor ~24 failed its check with HealthFactorTooLow (fork 2026-11-19, user's account; the wider lists pass).
  const widths = healthWidths(owner, configs);
  for (const level of NARROW_LEVELS) {
    const w = await widths(level);
    if (!w) continue;
    for (const candidate of candidates) {
      const batch = await tryCandidate(candidate, w([sent?.assetIndex, received?.assetIndex]));
      if (!batch) continue;
      try {
        return await swapBatch(batch, toToken.symbol, params.control);
      } catch (e) {
        throw omittedHealthError(e, label);
      }
    }
  }
  throw new Error(SWAP_TOO_LARGE_MESSAGE);
}

/** Sends a swap batch; if the swap part fails after the account-creation part landed, says that nothing was swapped. */
async function swapBatch(batch: BatchPart[], received: string, opts: BatchControl & { onStatus?: (s: "simulating" | "signing" | "sending" | "confirming") => void } = {}): Promise<string> {
  try {
    return await sendSolanaBatch(batch, { computeUnits: EXEC_COMPUTE_UNITS, ...opts });
  } catch (e) {
    if (e instanceof BatchPartError) throw new Error(`Nothing was swapped: ${e.message}. Only the empty account that receives ${received} was created. Please try again.`);
    throw e;
  }
}

// Titan routes tried for a margin swap, in the order below; the next one only when the previous does not fit 1,232 bytes. A Titan
// route is ONE swap_route_v3 instruction: unlimited, 3-4 hop routes have 69 to 87 accounts (43 to 53 different ones) and come to
// 1,421 to 1,596 B inside margin_execute even with 6 wallet-safe tables, so smaller routes are asked for (the quote route passes
// maxAccounts / onlyDirectRoutes to Titan as accountsLimitTotal / onlyDirectRoutes). A quote route that predates the limits
// refuses them (TitanLimitUnsupportedError); then only the unlimited route is tried.
// Measured on the live route (2026-11-18, SOL/USDC/USDT/JitoSOL/JupSOL/JupUSD/NVDAx/GOOGLx/AAPLx/TSLAx, $5 and $100): unlimited routes
// mostly do not fit, a limit of 32 fits almost every pair, 24 gives a single-pool route that fits all; onlyDirectRoutes is not
// reliable (still returns 2-4 hops), so it is not used. Unlimited is last: best price when it happens to fit.
const TITAN_MARGIN_ROUTES: (TitanRouteLimit | undefined)[] = [{ maxAccounts: 32 }, { maxAccounts: 24 }, undefined];

// Ported from Vanna_Finance_Backend apps/solana/lib/solana/titan.ts:executeMarginTitanSwap (and aggregator.ts:executeSwapQuote's retry).
// Titan's swap_route_v3 runs inside margin_execute. The quote comes from the website's route (src/chain/solana/titan.ts). The health
// accounts are compact (only held token groups, plus the received token), as for borrow and withdraw, so the transaction can fit
// with Titan's own (real mainnet) lookup tables plus COMMON_MAINNET_TABLES and no fork-only table, which Phantom cannot resolve.
// When it does not fit as one transaction, the atlas / vault account creation goes first and the swap second, in ONE approval.
// When a route does not fit at all, a route with fewer accounts is asked for (TITAN_MARGIN_ROUTES); only when none fits does the
// swap stop before signing with SWAP_TOO_LARGE_MESSAGE.
async function solanaMarginTitanSwap(params: { fromSym: string; toSym: string; amount: number | string; slippageBps?: number; control?: BatchControl }): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const margin = marginPda(owner);
  const fromToken = getToken(params.fromSym);
  const toToken = getToken(params.toSym);
  if (fromToken.symbol === toToken.symbol) throw new Error("Pick two different tokens");
  const rawIn = toRaw(params.amount, fromToken.decimals);
  if (rawIn <= 0n) throw new Error("Enter an amount");
  const configs = await readAllAssetConfigs();
  const received = [...configs.values()].find((c) => c.mint === toToken.mint && c.kind !== "venue");
  if (!received) throw new Error(`${toToken.symbol} is not on the protocol's allowed-token list`);

  const sentIdx = [...configs.values()].find((c) => c.mint === fromToken.mint && c.kind !== "venue")?.assetIndex;
  const label = `Swap ${fromToken.symbol} → ${toToken.symbol} (Titan)`;
  const receivedVault = marginVault(margin, toToken.mint, toToken.tokenProgram);
  const widths = healthWidths(owner, configs);

  type Attempt = { signature?: string; signing: boolean; error?: unknown; route: number };
  /** Builds and sends one quote; `null` when it does not fit the wallet (nothing signed). */
  const sendQuote = async (limit: TitanRouteLimit | undefined, onSigning: () => void, seen: Set<string>): Promise<string | null> => {
    const quote = await fetchTitanQuote({
      inputMint: fromToken.mint,
      outputMint: toToken.mint,
      amount: rawIn,
      userPublicKey: margin,
      slippageBps: params.slippageBps ?? 50,
      mode: "margin",
      limit,
    });
    const call = marginTitanCall(quote, margin);
    const key = call.accounts.map((a) => a.pubkey).join(",");
    if (seen.has(key)) return null; // the same route as one already measured: it does not fit either
    seen.add(key);
    const [atlas, createVault] = await Promise.all([
      missingAtlasAccounts(owner, call.accounts, call.mints),
      missingAtaIxs(owner, [{ account: receivedVault, wallet: margin, mint: toToken.mint, tokenProgram: toToken.tokenProgram }]),
    ]);
    const tables = [...new Set([...quote.addressLookupTables, ...COMMON_MAINNET_TABLES])];
    // The full compact health list first, then narrower lists that leave out the least valuable held tokens first and always keep
    // the two swapped tokens (healthWidths; see solanaMarginSwap).
    for (const level of [0, ...NARROW_LEVELS]) {
      const w = await widths(level);
      if (!w) continue;
      const execIx = await marginExecuteIx(owner, TITAN_PROGRAM_ID, call.data, call.accounts, null, [], [fromToken.mint, toToken.mint], {
        compact: true,
        pendingCollateral: [received.assetIndex],
        onlyAssets: w([received.assetIndex, sentIdx]),
      });
      for (const parts of setupSplits([...atlas, ...createVault], execIx, label, tables)) {
        const fit = await fitWalletParts(owner, tables, parts);
        if (typeof fit === "number") continue;
        try {
          return await swapBatch(fit, toToken.symbol, {
            ...params.control,
            onStatus: (s) => {
              if (s === "signing") onSigning();
            },
          });
        } catch (e) {
          throw level > 0 ? omittedHealthError(e, label) : e;
        }
      }
    }
    return null;
  };

  // Tries the routes from `start` on. A smaller route that fails to quote or to build (no route under that limit, a route type the
  // margin adapter refuses) is skipped; the unlimited route's errors and anything after signing stop the swap.
  const attempt = async (start: number): Promise<Attempt> => {
    let signing = false;
    let tooLarge = false;
    let firstError: unknown;
    const seen = new Set<string>();
    for (let route = start; route < TITAN_MARGIN_ROUTES.length; route++) {
      const limit = TITAN_MARGIN_ROUTES[route];
      try {
        const signature = await sendQuote(limit, () => {
          signing = true;
        }, seen);
        if (signature) return { signature, signing, route };
        tooLarge = true;
      } catch (error) {
        if (signing || error instanceof TitanUnavailableError || !limit) return { error, signing, route };
        if (error instanceof TitanLimitUnsupportedError) continue;
        if (/simulat|account keys|tick/i.test(String((error as Error)?.message ?? error))) return { error, signing, route };
        if (firstError === undefined) firstError = error;
      }
    }
    if (tooLarge || !firstError) return { error: new WalletTxTooLargeError(MAX_TX_BYTES + 1, label), signing, route: start };
    return { error: firstError, signing, route: start };
  };

  const first = await attempt(0);
  if (first.signature) return first.signature;
  if (first.error instanceof WalletTxTooLargeError) throw new Error(SWAP_TOO_LARGE_MESSAGE);
  // A simulation that failed before anything was signed usually means the fork's cloned pools had drifted from the ones Titan
  // quoted; the failed attempt re-clones them, so one fresh quote is tried at the same route size (backend aggregator.ts).
  if (first.signing || first.error instanceof TitanUnavailableError || !/simulat|account keys|tick/i.test(String((first.error as Error)?.message ?? first.error))) throw first.error;
  const second = await attempt(first.route);
  if (second.signature) return second.signature;
  if (second.error instanceof WalletTxTooLargeError) throw new Error(SWAP_TOO_LARGE_MESSAGE);
  throw second.error;
}

// ---------------------------------------------------------------------------------------------
// E) Farm: Kamino & Perena
// ---------------------------------------------------------------------------------------------

export interface KaminoReceiptConfig {
  symbol: string;
  underlying: string;
  market: string;
  marketAuthority: string;
  reserve: string;
  liquidityVault: string;
  collateralMint: string;
}

const KAMINO_MAIN_MARKET = "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF";
const KAMINO_MAIN_AUTHORITY = "9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo";
const INSTRUCTIONS_SYSVAR = "Sysvar1nstructions1111111111111111111111111";

export const KAMINO_RECEIPTS: Record<string, KaminoReceiptConfig> = {
  SOL: {
    symbol: "kSOL",
    underlying: "SOL",
    market: KAMINO_MAIN_MARKET,
    marketAuthority: KAMINO_MAIN_AUTHORITY,
    reserve: "d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q",
    liquidityVault: "GafNuUXj9rxGLn4y79dPu6MHSuPWeJR6UtTWuexpGh3U",
    collateralMint: "2UywZrUdyqs5vDchy7fKQJKau2RVyuzBev2XKGPDSiX1",
  },
  USDC: {
    symbol: "kUSDC",
    underlying: "USDC",
    market: KAMINO_MAIN_MARKET,
    marketAuthority: KAMINO_MAIN_AUTHORITY,
    reserve: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
    liquidityVault: "Bgq7trRgVMeq33yt235zM2onQ4bRDBsY5EWiTetF4qw6",
    collateralMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
  },
  USDT: {
    symbol: "kUSDT",
    underlying: "USDT",
    market: KAMINO_MAIN_MARKET,
    marketAuthority: KAMINO_MAIN_AUTHORITY,
    reserve: "H3t6qZ1JkguCNTi9uzVKqQ7dvt2cum4XiXWom6Gn5e5S",
    liquidityVault: "2Eff8Udy2G2gzNcf2619AnTx3xM4renEv4QrHKjS1o9N",
    collateralMint: "B8zf4kojJbwgCRKA7rLaLhRCZBGhgAJp8wPBVZZHMhSv",
  },
};

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\exec.ts:farmDeposit
export async function solanaFarmDeposit(params: {
  sym: string;
  walletAmount?: number | string;
  marginAmount?: number | string;
  borrowAmount?: number | string;
  /** onLeg / cancel / stop (submit.ts BatchControl). */
  control?: BatchControl;
}): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const margin = marginPda(owner);
  const token = getToken(params.sym);
  const r = KAMINO_RECEIPTS[token.symbol];
  if (!r) throw new Error(`No Kamino receipt configured for ${token.symbol}`);

  const walletRaw = toRaw(params.walletAmount ?? 0, token.decimals);
  const marginRaw = toRaw(params.marginAmount ?? 0, token.decimals);
  const borrowRaw = toRaw(params.borrowAmount ?? 0, token.decimals);
  const total = walletRaw + marginRaw + borrowRaw;
  if (total <= 0n) throw new Error("Enter an amount to supply to Kamino");

  // Legs that run before the Kamino call (wallet deposit, borrow) and their cleanup.
  const legs: RawInstruction[] = [];
  const legSuffix: RawInstruction[] = [];
  // FORK: the reserve and its vault must agree or Kamino's own check fails (alignKaminoReserveOnFork).
  const [configs] = await Promise.all([readAllAssetConfigs(), alignKaminoReserveOnFork(r.reserve, r.liquidityVault, r.collateralMint)]);
  const idxOf = (mint: string) => [...configs.values()].find((a) => a.mint === mint && a.kind !== "venue")?.assetIndex;
  const tIdx = idxOf(token.mint);
  const rIdx = idxOf(r.collateralMint);

  // 1. Wallet deposit if requested
  if (walletRaw > 0n) {
    let source = tokenAta(owner, token.mint, token.tokenProgram);
    if (token.isNative) {
      const wrap = await wrapSol(owner, walletRaw);
      legs.push(...wrap.instructions);
      source = wrap.ata;
      if (!wrap.existed) legSuffix.push(splTokenCloseAccountIx(wrap.ata, owner, owner, TOKEN_PROGRAM_ID));
    }
    legs.push(depositCollateralIx(owner, token, walletRaw, source));
  }

  // 2. Borrow for leverage if requested
  const pendingDebt: number[] = [];
  if (borrowRaw > 0n) {
    const maxDebtShares = (borrowRaw * 105n) / 100n;
    // user_borrow values the borrowed asset itself (web appendBorrows)
    const remaining = await buildHealthRemainingAccounts(margin, tIdx !== undefined ? { collateral: [tIdx], debt: tIdx } : {}, [token.mint], { compact: true });
    legs.push(borrowIx(owner, token, borrowRaw, maxDebtShares, remaining));
    if (tIdx !== undefined) pendingDebt.push(tIdx);
  }

  // 3. Receipt token account on the margin account (only when missing)
  const receiptVault = marginVault(margin, r.collateralMint, TOKEN_PROGRAM_ID);
  const createReceipt = await missingAtaIxs(owner, [{ account: receiptVault, wallet: margin, mint: r.collateralMint, tokenProgram: TOKEN_PROGRAM_ID }]);

  // 4. Kamino deposit CPI call
  // sha256("global:deposit_reserve_liquidity")[0..8] = [169, 201, 30, 126, 6, 205, 102, 68]
  const cpiData = Buffer.alloc(16);
  Buffer.from([169, 201, 30, 126, 6, 205, 102, 68]).copy(cpiData, 0);
  cpiData.writeBigUInt64LE(total, 8);

  const underlyingVault = marginVault(margin, token.mint, token.tokenProgram);
  const m = (pubkey: string, isWritable: boolean): AccountMeta => ({ pubkey, isSigner: false, isWritable });
  const cpiAccounts: AccountMeta[] = [
    m(margin, true),
    m(r.reserve, true),
    m(r.market, false),
    m(r.marketAuthority, false),
    m(token.mint, false),
    m(r.liquidityVault, true),
    m(r.collateralMint, true),
    m(underlyingVault, true),
    m(receiptVault, true),
    m(TOKEN_PROGRAM_ID, false),
    m(token.tokenProgram, false),
    m(INSTRUCTIONS_SYSVAR, false),
  ];

  // Compact health list (held tokens + the receipt this call creates); if that is too large, narrower lists that leave out the
  // least valuable held tokens first and always keep the two tokens involved (healthWidths). The old fallback listed only those
  // two and so left out the account's SOL: the check then counted almost no collateral (fork 2026-11-19, user's account at health
  // factor ~24: HealthFactorTooLow with [USDC, kUSDC]; the full list passes).
  const pending = [rIdx, ...(legs.length ? [tIdx] : [])].filter((x): x is number => x !== undefined);
  const exec = (onlyAssets?: number[]) =>
    marginExecuteIx(owner, KLEND_PROGRAM_ID, cpiData, cpiAccounts, null, [], [token.mint, r.collateralMint], { pendingDebt, pendingCollateral: pending, compact: true, onlyAssets });
  const label = `Farm ${token.symbol} on Kamino`;
  const widths = healthWidths(owner, configs);
  const variant = (level: number) => async () => {
    const only = await widths(level);
    if (!only) return null;
    const omits = level > 0;
    const call = [...createReceipt, await exec(only([tIdx, rIdx]))];
    if (!legs.length) return { parts: [{ instructions: call, label }], omits };
    const one = [...legs, ...call, ...legSuffix];
    // Wallet deposit / borrow first, then the Kamino call, signed together. If only the first lands, the funds sit in the margin
    // account as collateral (or as borrowed USDC there): safe, and Farm can be tried again.
    if ((await walletTablesFor(one, owner, KAMINO_WALLET_TABLES)).size <= MAX_TX_BYTES) return { parts: [{ instructions: one, label }], omits };
    return { parts: [{ instructions: [...legs, ...legSuffix], label: `${label}: move funds` }, { instructions: call, label }], omits };
  };
  return sendWalletParts(owner, KAMINO_WALLET_TABLES, [0, ...NARROW_LEVELS].map(variant), label, params.control);
}
// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\exec.ts:farmWithdraw
export async function solanaFarmWithdraw(params: {
  sym: string;
  receipts?: number | string;
  /** Raw receipt (cToken) amount, as the Farm screen converts the typed underlying amount (website kamino-action: share of the position's receipts). */
  receiptsRaw?: bigint;
  all?: boolean;
  /** onLeg / cancel / stop (submit.ts BatchControl). */
  control?: BatchControl;
}): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const margin = marginPda(owner);
  const token = getToken(params.sym);
  const r = KAMINO_RECEIPTS[token.symbol];
  if (!r) throw new Error(`No Kamino receipt configured for ${token.symbol}`);

  const receiptVault = marginVault(margin, r.collateralMint, TOKEN_PROGRAM_ID);
  const bal = await rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [receiptVault]);
  const held = BigInt(bal?.value?.amount ?? "0");
  if (held <= 0n) throw new Error(`No ${r.symbol} cTokens to withdraw`);

  const amount = params.all ? held : params.receiptsRaw ?? toRaw(params.receipts ?? 0, 6);
  if (amount <= 0n) throw new Error("Enter an amount of cTokens to redeem");
  if (amount > held) throw new Error(`Only ${fromRaw(held, 6)} ${r.symbol} available`);

  // sha256("global:redeem_reserve_collateral")[0..8] = [234, 117, 181, 125, 185, 142, 220, 29]
  const cpiData = Buffer.alloc(16);
  Buffer.from([234, 117, 181, 125, 185, 142, 220, 29]).copy(cpiData, 0);
  cpiData.writeBigUInt64LE(amount, 8);

  const underlyingVault = marginVault(margin, token.mint, token.tokenProgram);
  const m = (pubkey: string, isWritable: boolean): AccountMeta => ({ pubkey, isSigner: false, isWritable });
  const cpiAccounts: AccountMeta[] = [
    m(margin, true),
    m(r.market, false),
    m(r.reserve, true),
    m(r.marketAuthority, false),
    m(token.mint, false),
    m(r.collateralMint, true),
    m(r.liquidityVault, true),
    m(receiptVault, true),
    m(underlyingVault, true),
    m(TOKEN_PROGRAM_ID, false),
    m(token.tokenProgram, false),
    m(INSTRUCTIONS_SYSVAR, false),
  ];

  const [configs] = await Promise.all([readAllAssetConfigs(), alignKaminoReserveOnFork(r.reserve, r.liquidityVault, r.collateralMint)]);
  const idxOf = (mint: string) => [...configs.values()].find((a) => a.mint === mint && a.kind !== "venue")?.assetIndex;
  const tIdx = idxOf(token.mint);
  const rIdx = idxOf(r.collateralMint);
  // Compact health list (held tokens + the underlying this call pays out); if too large, narrower lists that leave out the least
  // valuable held tokens first and keep the two tokens involved (healthWidths; see solanaFarmDeposit).
  const widths = healthWidths(owner, configs);
  const variant = (level: number) => async () => {
    const only = await widths(level);
    if (!only) return null;
    return {
      parts: [{
        instructions: [await marginExecuteIx(owner, KLEND_PROGRAM_ID, cpiData, cpiAccounts, null, [], [token.mint, r.collateralMint], { compact: true, pendingCollateral: tIdx !== undefined ? [tIdx] : [], onlyAssets: only([tIdx, rIdx]) })],
        label: `Exit ${token.symbol} on Kamino`,
      }],
      omits: level > 0,
    };
  };
  return sendWalletParts(owner, KAMINO_WALLET_TABLES, [0, ...NARROW_LEVELS].map(variant), `Exit ${token.symbol} on Kamino`, params.control);
}

// ---------------------------------------------------------------------------------------------
// F) Perps: Phoenix Perpetual Orders & Margin Management (Implemented in perps-ix.ts)
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// G) Flash Repay: the transaction builders (planning and sending live in flash-repay.ts)
// ---------------------------------------------------------------------------------------------
//
// Each builder returns finished transaction parts (wallet-safe tables, widest health list that fits) WITHOUT sending them, so
// flash-repay.ts can sign a whole run in one approval. A part that runs after earlier parts of the same run is built for the state
// those parts leave (FlashProjection): checked on the fork 2026-11-19, a compact health list may name a token whose vault is empty by
// then (zero balances are not priced), but the venue and debt groups must match exactly ("a missing or extra group fails"), so a part
// that runs after the Phoenix venue empties is built with it closed, and the tokens earlier parts bring in are listed as pending.

/** An amount for a leg label: 4 decimals for 8-9 decimal tokens, 2 for the rest ("0.5000 SOL", "100.00 USDC"). */
const legAmount = (raw: bigint, decimals: number) => Number(fromRaw(raw, decimals)).toFixed(decimals > 6 ? 4 : 2);

/** The state earlier parts of a run leave, for the health list of a later part. */
export type FlashProjection = {
  /** The Phoenix venue is emptied by an earlier part (exact withdraw of all its collateral, no position open). */
  venueClosed?: boolean;
  /** Mints an earlier part brings into the margin account (listed as held, with their oracle accounts). */
  received?: string[];
};

/** A built part plus where it goes relative to the builder's first part (0 = same stage, 1 = the stage after). */
export type FlashPart = BatchPart & { offset: number };

/** The first variant whose every part fits a wallet transaction (wallet-safe tables only); WalletTxTooLargeError when none does. */
async function fitFirstVariant(owner: string, candidates: string[], variants: (() => Promise<WalletPart[] | null>)[], label: string): Promise<BatchPart[]> {
  let biggest = 0;
  for (const build of variants) {
    const parts = await build();
    if (!parts) continue;
    const fit = await fitWalletParts(owner, candidates, parts);
    if (typeof fit !== "number") return fit;
    biggest = fit;
  }
  throw new WalletTxTooLargeError(biggest, label);
}

/** Asset indexes of these mints (tokens, not venues), and the Phoenix venue's index. */
function projectionIndexes(configs: Map<number, AssetConfigState>, proj: FlashProjection = {}) {
  const idxOf = (mint: string) => [...configs.values()].find((a) => a.mint === mint && a.kind !== "venue")?.assetIndex;
  const venue = [...configs.values()].find((a) => a.mint === PHOENIX_EXCHANGE)?.assetIndex;
  const received = (proj.received ?? []).map(idxOf).filter((x): x is number => x !== undefined);
  return { idxOf, received, closedVenue: proj.venueClosed && venue !== undefined ? venue : undefined };
}

/** The Phoenix side of a margin account as Flash repay plans it (read only). */
export type FlashPhoenixState = {
  /** Trader collateral and the phUSD waiting in the margin account (raw, 6 decimals). */
  collateral: bigint;
  phUsd: bigint;
  /** Each open position at the copied mark: size, entry quote and funding owed, so the plan can value the close. */
  positions: { key: string; side: "long" | "short"; tokens: number; markUsd: number; quoteUsd: number; fundingUsd: number; takerFee: number }[];
  /** Phoenix has a queued withdrawal for this trader (nothing can be withdrawn until it clears). */
  queued: boolean;
};

/** Reads the trader account, the marks and the taker fees (orderbook header, u32 micro at byte 96, as the website reads it). */
export async function readFlashPhoenix(owner: string): Promise<FlashPhoenixState> {
  const margin = marginPda(owner);
  const [ex, traderInfo] = await Promise.all([
    readPhoenixExchange(),
    rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [phoenixTraderPda(margin), { encoding: "base64" }]),
  ]);
  const trader = traderInfo?.value ? decodeTrader(Buffer.from(traderInfo.value.data[0], "base64")) : null;
  const ph = BigInt((await rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [marginVault(margin, ex.canonicalMint, TOKEN_PROGRAM_ID)]).catch(() => null))?.value?.amount ?? "0");
  const open = (trader?.positions ?? []).filter((x) => x.baseLots !== 0n);
  if (!open.length) return { collateral: trader?.collateral ?? 0n, phUsd: ph, positions: [], queued: !!trader && (trader.hot || trader.withdrawQueued) };
  const splines = await fetchPerpAssetMap(ex.perpAssetMap);
  const books = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [
    open.map((x) => splines.find((s) => s.assetId === x.assetId)?.orderbook ?? SYSTEM_PROGRAM_ID),
    { encoding: "base64", dataSlice: { offset: 96, length: 4 } },
  ]);
  const positions = open.map((x, i) => {
    const s = splines.find((q) => q.assetId === x.assetId);
    const tokens = s ? Number(x.baseLots) / 10 ** s.lotDecimals : 0;
    const fee = books.value[i] ? Buffer.from(books.value[i]!.data[0], "base64").readUInt32LE(0) / 1e6 : 0.0005;
    return {
      key: (s?.symbol ?? `#${x.assetId}`).toUpperCase(),
      side: (x.baseLots > 0n ? "long" : "short") as "long" | "short",
      tokens,
      markUsd: s ? ticksToUsd(s, s.markTicks) : 0,
      quoteUsd: Number(x.virtualQuoteLots) / 1e6,
      fundingUsd: s ? -Number((s.cumulativeFunding - x.fundingSnapshot) * x.baseLots) / 1e6 : 0,
      takerFee: fee,
    };
  });
  return { collateral: trader?.collateral ?? 0n, phUsd: ph, positions, queued: !!trader && (trader.hot || trader.withdrawQueued) };
}

/** One open Phoenix position, as Flash repay closes it. */
export type FlashPerpClose = { key: string; side: "long" | "short"; assetId: number; lots: bigint; limitUsd: number; markUsd: number; lotDecimals: number };

/**
 * Close orders for every open Phoenix position (reduce-only market orders for the whole size, limit = mark -/+ `slippageBps`), each
 * its own part; they do not depend on each other (one stage). Phoenix settles the close into the trader's collateral (fork
 * 2026-11-19: collateral 29.979334 -> 29.911284 USDC, position entry gone), so the USDC comes home with a later exact withdraw.
 * `before` of every part refreshes all the markets in one pass.
 */
export async function buildFlashPerpsCloses(owner: string, slippageBps: number): Promise<{ parts: FlashPart[]; closes: FlashPerpClose[] }> {
  const p0 = await loadPerps(owner);
  const ids = (p0.trader?.positions ?? []).filter((x) => x.baseLots !== 0n).map((x) => x.assetId);
  if (!ids.length) return { parts: [], closes: [] };
  const splines0 = await fetchPerpAssetMap(p0.ex.perpAssetMap);
  const keys = ids.map((id) => splines0.find((s) => s.assetId === id)?.symbol.toUpperCase()).filter((k): k is string => !!k);
  const { splines } = await refreshPerpsMarketsOnFork(keys);
  const p = await loadPerps(owner);
  await grantPhoenixCapabilitiesOnFork(p.margin);
  const refreshAll = async (retry: boolean) => void (await refreshPerpsMarketsOnFork(keys, retry));
  const closes: FlashPerpClose[] = [];
  const parts: FlashPart[] = [];
  const widths = healthWidths(owner, p.assetMap);
  for (const pos of (p.trader?.positions ?? []).filter((x) => x.baseLots !== 0n)) {
    const spline = splines.find((s) => s.assetId === pos.assetId);
    if (!spline) throw new Error(`Phoenix market ${pos.assetId} is not listed`);
    const key = spline.symbol.toUpperCase();
    const isLong = pos.baseLots > 0n;
    const mark = ticksToUsd(spline, spline.markTicks);
    if (!(mark > 0)) throw new Error(`No price for ${key}-PERP`);
    const limitUsd = isLong ? mark * (1 - slippageBps / 10_000) : mark * (1 + slippageBps / 10_000);
    const lots = isLong ? pos.baseLots : -pos.baseLots;
    const label = `Close ${key}-PERP ${isLong ? "long" : "short"} on Phoenix`;
    const [part] = await fitFirstVariant(owner, PHOENIX_MAINNET_TABLES, [0, ...NARROW_LEVELS].map((level) => async () => {
      const only = await widths(level);
      if (!only) return null;
      return [{
        instructions: [await phoenixCall(p, marketOrderData({ side: isLong ? ASK : BID, priceInTicks: usdToTicks(spline, limitUsd), lots, reduceOnly: true }), orderAccounts(p.ex, p.margin, spline), [spline.assetId], [], { onlyAssets: only([]) })],
        label,
        before: refreshAll,
      }];
    }), label);
    parts.push({ ...part, offset: 0 });
    closes.push({ key, side: isLong ? "long" : "short", assetId: pos.assetId, lots, limitUsd, markUsd: mark, lotDecimals: spline.lotDecimals });
  }
  return { parts, closes };
}

/**
 * The exact withdraw of ALL the Phoenix collateral (and the unwrap of every phUSD in the margin account into USDC), built from the
 * chain as it is now. Phoenix pays only an exact amount up to the collateral: checked on the fork 2026-11-19 (no position open,
 * collateral 29.911284): the exact collateral passes, collateral + 1 fails (InsufficientMargin), u64::MAX / i64::MAX fail in Vanna's
 * validator (WithdrawWouldQueue) and 0 fails (ZeroAmount). So this is built only once no position is open; it empties the venue.
 * Parts: one (withdraw + unwrap) or two (withdraw, then unwrap: offset 1). Null when Phoenix holds nothing and no phUSD waits.
 */
export async function buildFlashPhoenixWithdraw(owner: string): Promise<{ parts: FlashPart[]; usdc: bigint; venueCloses: boolean } | null> {
  const assetMap = await readAllAssetConfigs();
  await ensureFreshForkPrices(TOKENS, assetMap);
  const p = await loadPerps(owner);
  if (p.openAssetIds.length) throw new Error("A Perps position is still open: Phoenix can only pay out once every position is closed");
  await grantPhoenixCapabilitiesOnFork(p.margin);
  const collateral = p.trader?.collateral ?? 0n;
  const ph = BigInt((await rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [marginVault(p.margin, p.ex.canonicalMint, TOKEN_PROGRAM_ID)]).catch(() => null))?.value?.amount ?? "0");
  if (collateral <= 0n && ph <= 0n) return null;
  const amount = collateral > 0n ? collateral : 0n;
  const label = amount > 0n ? `Withdraw ${legAmount(amount, 6)} USDC from Phoenix` : "Turn phUSD back into USDC";
  const variants = perpsWithdrawVariants(p, amount, amount > 0n);
  const parts = await fitFirstVariant(owner, PHOENIX_MAINNET_TABLES, variants.map((v) => async () => {
    const built = await v();
    return built ? built.parts : null;
  }), label);
  return {
    parts: parts.map((x, i) => ({ ...x, label: i === 0 ? label : "Unwrap phUSD to USDC", offset: i })),
    usdc: amount + ph,
    venueCloses: amount > 0n,
  };
}

/** Kamino exit of `receiptsRaw` cTokens of `sym` (all the position), the underlying staying in the margin account. */
export async function buildFlashFarmExit(owner: string, sym: string, receiptsRaw: bigint, proj: FlashProjection = {}): Promise<FlashPart> {
  const margin = marginPda(owner);
  const token = getToken(sym);
  const r = KAMINO_RECEIPTS[token.symbol];
  if (!r) throw new Error(`No Kamino receipt configured for ${token.symbol}`);
  if (receiptsRaw <= 0n) throw new Error(`No ${r.symbol} to redeem`);
  const cpiData = Buffer.alloc(16);
  Buffer.from([234, 117, 181, 125, 185, 142, 220, 29]).copy(cpiData, 0); // redeem_reserve_collateral
  cpiData.writeBigUInt64LE(receiptsRaw, 8);
  const receiptVault = marginVault(margin, r.collateralMint, TOKEN_PROGRAM_ID);
  const underlyingVault = marginVault(margin, token.mint, token.tokenProgram);
  const m = (pubkey: string, isWritable: boolean): AccountMeta => ({ pubkey, isSigner: false, isWritable });
  const cpiAccounts: AccountMeta[] = [
    m(margin, true), m(r.market, false), m(r.reserve, true), m(r.marketAuthority, false), m(token.mint, false), m(r.collateralMint, true),
    m(r.liquidityVault, true), m(receiptVault, true), m(underlyingVault, true), m(TOKEN_PROGRAM_ID, false), m(token.tokenProgram, false), m(INSTRUCTIONS_SYSVAR, false),
  ];
  const [configs] = await Promise.all([readAllAssetConfigs(), alignKaminoReserveOnFork(r.reserve, r.liquidityVault, r.collateralMint)]);
  const { idxOf, received, closedVenue } = projectionIndexes(configs, proj);
  const tIdx = idxOf(token.mint);
  const rIdx = idxOf(r.collateralMint);
  const widths = healthWidths(owner, configs);
  const label = `Exit ${token.symbol} on Kamino`;
  const pending = [...new Set([...(tIdx !== undefined ? [tIdx] : []), ...received])];
  const [part] = await fitFirstVariant(owner, KAMINO_WALLET_TABLES, [0, ...NARROW_LEVELS].map((level) => async () => {
    const only = await widths(level);
    if (!only) return null;
    const exec = await marginExecuteIx(owner, KLEND_PROGRAM_ID, cpiData, cpiAccounts, null, [], [token.mint, r.collateralMint], {
      compact: true, pendingCollateral: pending, onlyAssets: only([tIdx, rIdx, ...received]),
      ...(closedVenue !== undefined ? { closedVenue, venueScan: false } : {}),
    });
    return [{ instructions: [exec], label }];
  }), label);
  return { ...part, offset: 0 };
}

/**
 * A Jupiter swap of exactly `amountRaw` of `fromSym` into `toSym` inside the margin account, quoted now (route sizes as
 * solanaMarginSwap tries them, first that fits a wallet transaction). `minOut` is what the route guarantees at `slippageBps`.
 * Parts: the swap (offset 0), or the creation of the receiving vault (offset 0) then the swap (offset 1).
 */
export async function buildFlashSwap(owner: string, fromSym: string, toSym: string, amountRaw: bigint, slippageBps: number, proj: FlashProjection = {}): Promise<{ parts: FlashPart[]; outAmount: bigint; minOut: bigint }> {
  const margin = marginPda(owner);
  const fromToken = getToken(fromSym);
  const toToken = getToken(toSym);
  if (amountRaw <= 0n) throw new Error("Nothing to swap");
  const receivedVault = marginVault(margin, toToken.mint, toToken.tokenProgram);
  const [vaultInfo, configs] = await Promise.all([
    rpc<{ value: unknown }>("getAccountInfo", [receivedVault, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]),
    readAllAssetConfigs(),
  ]);
  const setup = vaultInfo.value ? [] : [createAssociatedTokenAccountIdempotentIx(owner, receivedVault, margin, toToken.mint, toToken.tokenProgram)];
  const { idxOf, received, closedVenue } = projectionIndexes(configs, proj);
  const recvIdx = idxOf(toToken.mint);
  const sentIdx = idxOf(fromToken.mint);
  const pending = [...new Set([...(recvIdx !== undefined ? [recvIdx] : []), ...received])];
  const label = toToken.symbol === "USDC" || toToken.symbol === "USDT" ? `Sell ${legAmount(amountRaw, fromToken.decimals)} ${fromToken.symbol} on Jupiter` : `Buy back ${toToken.symbol} on Jupiter`;
  const widths = healthWidths(owner, configs);
  const tried = new Set<string>();
  for (const route of JUPITER_MARGIN_ROUTES) {
    const quoteRes = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${fromToken.mint}&outputMint=${toToken.mint}&amount=${amountRaw}&slippageBps=${slippageBps}&dexes=${JUPITER_FORK_DEXES}&${route.query}`);
    if (!quoteRes.ok) continue;
    const quote = await quoteRes.json();
    if (!Array.isArray(quote?.routePlan)) continue;
    const key = `${route.shared}:${quote.routePlan.map((r: { swapInfo?: { ammKey?: string } }) => r.swapInfo?.ammKey).join(">")}`;
    if (tried.has(key)) continue;
    tried.add(key);
    const swapRes = await fetch("https://lite-api.jup.ag/swap/v1/swap-instructions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteResponse: quote, userPublicKey: margin, wrapAndUnwrapSol: false, useSharedAccounts: route.shared }),
    });
    if (!swapRes.ok) continue;
    const swapData = await swapRes.json();
    const swapIx: { data: string; accounts: { pubkey: string; isWritable: boolean }[] } | undefined = swapData.swapInstruction;
    if (!swapIx) continue;
    const data = Buffer.from(swapIx.data, "base64");
    const accounts = swapIx.accounts.map((a) => ({ pubkey: a.pubkey, isSigner: false, isWritable: a.isWritable }));
    const tables = [...new Set([...(swapData.addressLookupTableAddresses ?? []), ...COMMON_MAINNET_TABLES])];
    for (const level of [0, ...NARROW_LEVELS]) {
      const only = await widths(level);
      if (!only) continue;
      const exec = await marginExecuteIx(owner, JUPITER_V6_PROGRAM_ID, data, accounts, null, [], [fromToken.mint, toToken.mint], {
        compact: true, pendingCollateral: pending, onlyAssets: level ? only([sentIdx, recvIdx, ...received]) : undefined,
        ...(closedVenue !== undefined ? { closedVenue, venueScan: false } : {}),
      });
      for (const split of setupSplits(setup, exec, label, tables)) {
        const fit = await fitWalletParts(owner, tables, split);
        if (typeof fit === "number") continue;
        return {
          parts: fit.map((x, i) => ({ ...x, label: i === fit.length - 1 ? label : `${label}: prepare account`, offset: i })),
          outAmount: BigInt(quote.outAmount ?? 0),
          minOut: BigInt(quote.otherAmountThreshold ?? quote.outAmount ?? 0),
        };
      }
    }
  }
  if (!tried.size) throw new Error(`Jupiter has no route for ${fromToken.symbol} to ${toToken.symbol} right now`);
  throw new Error(`${SWAP_TOO_LARGE_MESSAGE} (${fromToken.symbol} to ${toToken.symbol})`);
}

/**
 * repay_all of the whole `sym` loan from the margin account's own vault, and the debt position closed (rent back). Checked on the fork
 * 2026-11-19: repay_all repays the exact accrued debt whatever `max_assets` says (52.275008 USDC taken with max_assets 30 below the
 * debt, equal, or u64::MAX), so the part stays right however long the approval takes, as long as the vault holds the debt then.
 */
export async function buildFlashRepay(owner: string, sym: string, debtRaw: bigint): Promise<FlashPart> {
  const token = getToken(sym);
  const label = `Repay ${legAmount(debtRaw, token.decimals)} ${token.symbol}`;
  const ixs = [repayFromMarginIx(owner, token, debtRaw + (debtRaw * 20n) / 10_000n + 1n, true), reclaimRentIx(owner, token)];
  const [part] = await fitFirstVariant(owner, MARGIN_WALLET_TABLES, [async () => [{ instructions: ixs, label }]], label);
  return { ...part, offset: 0 };
}

/**
 * Withdraws `amountRaw` of `sym` from the margin account to the wallet, for a part that runs after every loan was repaid: with no
 * debt the core checks no health, so no health accounts (as solanaWithdrawCollateral does without debt).
 */
export async function buildFlashWithdraw(owner: string, sym: string, amountRaw: bigint): Promise<FlashPart> {
  const token = getToken(sym);
  const prefix: RawInstruction[] = [];
  const suffix: RawInstruction[] = [];
  let destination = tokenAta(owner, token.mint, token.tokenProgram);
  if (token.isNative) {
    const temp = await temporaryWsolReceiver(owner);
    prefix.push(...temp.setup);
    suffix.push(...temp.cleanup);
    destination = temp.account;
  } else {
    prefix.push(createAssociatedTokenAccountIdempotentIx(owner, destination, owner, token.mint, token.tokenProgram));
  }
  const ix = withdrawCollateralIx(owner, token, amountRaw, 1_100_000_000_000_000_000n, destination, []);
  const label = `Send ${legAmount(amountRaw, token.decimals)} ${token.symbol} to your wallet`;
  const [part] = await fitFirstVariant(owner, MARGIN_WALLET_TABLES, [async () => [{ instructions: [...prefix, ix, ...suffix], label }]], label);
  return { ...part, offset: 0 };
}

// ---------------------------------------------------------------------------------------------
// H) Wallet & Margin Transfers
// ---------------------------------------------------------------------------------------------

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts:deposit
export async function solanaDepositMarginCollateral(sym: string, amount: number | string): Promise<string> {
  return solanaDepositAndBorrow({ deposits: [{ sym, amount }] });
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\margin.ts:withdraw
export async function solanaWithdrawMarginCollateral(sym: string, amount: number | string): Promise<string> {
  return solanaWithdrawCollateral({ sym, amount });
}

/**
 * Wallet -> External address transfer (native SOL or SPL Token).
 */
export async function solanaWalletTransfer(
  destination: string,
  sym: string,
  amount: number | string
): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const token = getToken(sym);
  const rawAmount = toRaw(amount, token.decimals);
  if (rawAmount <= 0n) throw new Error("Enter an amount to transfer");

  if (token.isNative) {
    const ix = systemTransferIx(owner, destination, rawAmount);
    return sendSolanaInstructions([ix], { label: `Transfer ${token.symbol}` });
  }

  const sourceAta = tokenAta(owner, token.mint, token.tokenProgram);
  const destAta = tokenAta(destination, token.mint, token.tokenProgram);

  const createAta = createAssociatedTokenAccountIdempotentIx(owner, destAta, destination, token.mint, token.tokenProgram);
  const transfer = splTokenTransferIx(sourceAta, destAta, owner, rawAmount, token.tokenProgram);

  return sendSolanaInstructions([createAta, transfer], { label: `Transfer ${token.symbol}` });
}

// ---------------------------------------------------------------------------------------------
// I) Devnet / Fork Faucet
// ---------------------------------------------------------------------------------------------

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\server\fork-faucet.ts:fundOnFork
export async function solanaFundFaucet(
  recipient: string,
  sym?: string
): Promise<{ ok: boolean; results: { symbol: string; recipient: string; added: string; balance: string }[] }> {
  const tokensToFund = sym && sym !== "all" ? [getToken(sym)] : TOKENS;
  const results: { symbol: string; recipient: string; added: string; balance: string }[] = [];

  for (const token of tokensToFund) {
    const addRaw = BigInt(token.faucetAmount) * 10n ** BigInt(token.decimals);
    if (token.isNative) {
      const balRes = await rpc<{ value: number }>("getBalance", [recipient]);
      const current = BigInt(balRes?.value ?? 0);
      const next = current + addRaw;
      await rpc("surfnet_setAccount", [recipient, { lamports: Number(next) }]);
      results.push({ symbol: token.symbol, recipient, added: fromRaw(addRaw, 9), balance: fromRaw(next, 9) });
    } else {
      const ata = tokenAta(recipient, token.mint, token.tokenProgram);
      let current = 0n;
      try {
        const balRes = await rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [ata]);
        current = BigInt(balRes?.value?.amount ?? "0");
      } catch {}
      const next = current + addRaw;
      await rpc("surfnet_setTokenAccount", [
        recipient,
        token.mint,
        { amount: Number(next) },
        token.tokenProgram,
      ]);
      results.push({ symbol: token.symbol, recipient, added: fromRaw(addRaw, token.decimals), balance: fromRaw(next, token.decimals) });
    }
  }

  return { ok: true, results };
}

// ---------------------------------------------------------------------------------------------
// J) Perena and Phoenix Perps (Full Zero-Dependency Ports)
// ---------------------------------------------------------------------------------------------

// Ported from apps/solana/lib/solana/perena.ts:PERENA_SHARES
export const PERENA_VAULT = "ECJGrTZ6QYMEwiEAnL4oReWF126uc22e9Lojy9qyCjHT";
export const PERENA_VAULT_ORACLE = "2YH9QB7qmEBgekeXH4C36L2dwMPfLdoPi5DDxeTi1kyP";
export const PERENA_TRANCHE_STATE = "FbsiAonbNrC3EKWMrZxx9iSc5Q7e7zSAkro4tD8dQQJS";
export const PERENA_FEE_VAULT = "EAf7PeuCxhMN9gEhE1Gagmj28krmu3wEqCLMbqpSTVqg";

export interface PerenaShareMeta {
  mint: string;
  account: string;
  priceAt: number;
  tranche: boolean;
}

export const PERENA_SHARES: Record<"usdstar" | "usdstarj", PerenaShareMeta> = {
  usdstar: {
    mint: "star9agSpjiFe3M49B3RniVU4CMBBEK3Qnaqn3RGiFM",
    account: PERENA_VAULT,
    priceAt: 1584,
    tranche: false,
  },
  usdstarj: {
    mint: "3AJYCjrhKitmBd8tRUurPA5dGHCAQh6A8L9DkuSC37Rm",
    account: PERENA_TRANCHE_STATE,
    priceAt: 256,
    tranche: true,
  },
};

const EXECUTE_DEPOSIT = [247, 103, 46, 184, 88, 188, 56, 46];
const EXECUTE_WITHDRAW = [255, 93, 15, 141, 187, 94, 246, 162];
const EXECUTE_TRANCHE_DEPOSIT = [231, 224, 46, 207, 175, 45, 77, 148];
const EXECUTE_TRANCHE_WITHDRAW = [240, 82, 254, 246, 177, 29, 57, 126];
const JUNIOR = 0;

// Ported from apps/solana/lib/solana/perena.ts:perenaShareKeyFromString
export function resolvePerenaVaultKey(value: string): "usdstar" | "usdstarj" {
  const v = value.toLowerCase().replace(/[^a-z]/g, "");
  if (v === "usdstar" || v === "usd" || v === "star" || v === "perenausdstar") return "usdstar";
  if (v === "usdstarj" || v === "junior" || v === "usdstarjunior" || v === "perenajunior" || v === "j") return "usdstarj";
  throw new Error(`unknown Perena vault "${value}" — expected usdstar|junior`);
}

// Ported from apps/solana/lib/solana/perena.ts:perenaCallData
export function perenaCallData(share: PerenaShareMeta, call: "deposit" | "withdraw", amount: bigint): Buffer {
  const selector = share.tranche
    ? call === "deposit"
      ? EXECUTE_TRANCHE_DEPOSIT
      : EXECUTE_TRANCHE_WITHDRAW
    : call === "deposit"
      ? EXECUTE_DEPOSIT
      : EXECUTE_WITHDRAW;
  const kind = share.tranche ? [JUNIOR] : [];
  const data = Buffer.alloc(8 + kind.length + 8);
  Buffer.from([...selector, ...kind]).copy(data, 0);
  data.writeBigUInt64LE(amount, 8 + kind.length);
  return data;
}

// Ported from apps/solana/lib/solana/perena.ts:perenaCallAccounts
export function perenaCallAccounts(share: PerenaShareMeta, call: "deposit" | "withdraw", margin: string): AccountMeta[] {
  const w = (pubkey: string): AccountMeta => ({ pubkey, isWritable: true, isSigner: false });
  const r = (pubkey: string): AccountMeta => ({ pubkey, isWritable: false, isSigner: false });
  const marginUsdc = w(marginVault(margin, USDC_MINT, TOKEN_PROGRAM_ID));
  const marginShares = w(marginVault(margin, share.mint, TOKEN_PROGRAM_ID));
  const vaultUsdc = w(marginVault(PERENA_VAULT, USDC_MINT, TOKEN_PROGRAM_ID));
  const fees = [w(PERENA_FEE_VAULT), w(marginVault(PERENA_FEE_VAULT, USDC_MINT, TOKEN_PROGRAM_ID))];
  const programs = [r(TOKEN_PROGRAM_ID), r(TOKEN_PROGRAM_ID)];
  if (!share.tranche) {
    return [
      r(margin),
      w(PERENA_VAULT),
      r(PERENA_VAULT_ORACLE),
      r(PERENA_TRANCHE_STATE),
      r(USDC_MINT),
      w(share.mint),
      marginUsdc,
      vaultUsdc,
      ...fees,
      marginShares,
      ...programs,
    ];
  }
  const head = [
    w(margin),
    w(PERENA_VAULT),
    r(PERENA_VAULT_ORACLE),
    w(PERENA_TRANCHE_STATE),
    r(USDC_MINT),
    w(share.mint),
    marginUsdc,
    vaultUsdc,
  ];
  const tail = [
    ...programs,
    r(ASSOCIATED_TOKEN_PROGRAM_ID),
    r(SYSTEM_PROGRAM_ID),
  ];
  return call === "deposit"
    ? [...head, ...fees, marginShares, ...tail]
    : [...head, marginShares, ...tail];
}

// Ported from apps/solana/lib/solana/perena.ts:perenaCallData and apps/solana/lib/solana/vault-actions.ts:prepareVaultAction
export async function solanaPerenaAction(
  vaultId: string,
  call: "deposit" | "withdraw",
  amountUi: number | string
): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const margin = marginPda(owner);
  const shareKey = resolvePerenaVaultKey(vaultId);
  const share = PERENA_SHARES[shareKey];
  let rawAmount = toRaw(amountUi, 6);

  if (rawAmount <= 0n) throw new Error("Amount must be greater than zero");

  // Ensure margin ATAs for USDC and share mint exist
  const marginUsdcAta = marginVault(margin, USDC_MINT, TOKEN_PROGRAM_ID);
  const marginShareAta = marginVault(margin, share.mint, TOKEN_PROGRAM_ID);

  // A position is shown in dollars, but the vault redeems shares, so turn the typed value into shares at the vault's price.
  if (call === "withdraw") {
    const [balance, vault] = await Promise.all([
      rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [marginShareAta]).catch(() => null),
      rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [share.account, { encoding: "base64" }]),
    ]);
    const held = BigInt(balance?.value?.amount ?? "0");
    if (held <= 0n) throw new Error("No position in this vault");
    if (!vault?.value) throw new Error("Vault not found");
    const price = Buffer.from(vault.value.data[0], "base64").readBigUInt64LE(share.priceAt);
    const worth = (held * price) / 1_000_000n;
    rawAmount = rawAmount * 10_000n >= worth * 9_999n ? held : mulDivCeil(rawAmount, 1_000_000n, price);
    if (rawAmount > held) rawAmount = held;
  }

  const createAtas = await missingAtaIxs(owner, [
    { account: marginUsdcAta, wallet: margin, mint: USDC_MINT, tokenProgram: TOKEN_PROGRAM_ID },
    { account: marginShareAta, wallet: margin, mint: share.mint, tokenProgram: TOKEN_PROGRAM_ID },
  ]);

  const cpiData = perenaCallData(share, call, rawAmount);
  const cpiAccounts = perenaCallAccounts(share, call, margin);
  const configs = await readAllAssetConfigs();
  const idxOf = (mint: string) => [...configs.values()].find((a) => a.mint === mint && a.kind !== "venue")?.assetIndex;
  const usdcIdx = idxOf(USDC_MINT);
  const shareIdx = idxOf(share.mint);
  const gets = call === "deposit" ? shareIdx : usdcIdx;
  const label = `Perena ${call === "deposit" ? "Deposit" : "Withdraw"} ${shareKey === "usdstar" ? "USD*" : "USD* Junior"}`;
  // Compact health list (held tokens + the token this call pays out); if too large, narrower lists that leave out the least
  // valuable held tokens first and keep USDC and the share token (healthWidths). The old fallback listed only those two: on the
  // user's account (fork 2026-11-19) the check then failed with StalePrice; the full list passes.
  const widths = healthWidths(owner, configs);
  const variant = (level: number) => async () => {
    const only = await widths(level);
    if (!only) return null;
    const call = await marginExecuteIx(owner, PERENA_PROGRAM_ID, cpiData, cpiAccounts, null, [], [USDC_MINT, share.mint], { compact: true, pendingCollateral: gets !== undefined ? [gets] : [], onlyAssets: only([usdcIdx, shareIdx]) });
    return { parts: [{ instructions: [...createAtas, call], label }], omits: level > 0 };
  };
  return sendWalletParts(owner, PERENA_WALLET_TABLES, [0, ...NARROW_LEVELS].map(variant), label);
}

// ---------------------------------------------------------------------------------------------
// Phoenix Perps Integration
// ---------------------------------------------------------------------------------------------

export const PHOENIX_LOG_AUTHORITY = "GdxfTLSsdSY37G6fZoYtdGDSfgFnbT2EmRpuePZxWShS";
export const ADDRESS_LOOKUP_TABLE_PROGRAM = "AddressLookupTab1e1111111111111111111111111";

export const TRADER_FLAGS_OFFSET = 96;
export const FULL_TRADER_CAPABILITIES = 0x3e;

export const BID = 0;
export const ASK = 1;
export const IMMEDIATE_OR_CANCEL = 2;
export const REDUCE_ONLY = 128;

export const DEPOSIT_FUNDS = [202, 39, 52, 211, 53, 20, 250, 88];
export const WITHDRAW_FUNDS = [241, 36, 29, 111, 208, 31, 104, 217];
export const PLACE_MARKET_ORDER = [90, 118, 192, 252, 192, 99, 39, 145];
export const EMBER_DEPOSIT = [242, 35, 198, 137, 82, 225, 242, 182];
export const EMBER_WITHDRAW = [183, 18, 70, 156, 148, 109, 161, 34];
export const REGISTER_TRADER = [75, 243, 224, 167, 1, 5, 51, 32];

export interface PhoenixExchangeState {
  canonicalMint: string;
  globalVault: string;
  perpAssetMap: string;
  traderIndex: string[];
  activeBuffer: string[];
  withdrawQueue: string;
  emberState: string;
  emberVault: string;
}

export interface PhoenixMarketState {
  symbol: string;
  assetId: number;
  orderbook: string;
  spline: string;
  tickSize: bigint;
  lotDecimals: number;
  markTicks: bigint;
  cumulativeFunding: bigint;
  isolatedOnly: boolean;
  afterHours?: boolean;
}

export interface PhoenixPosition {
  assetId: number;
  baseLots: bigint;
  virtualQuoteLots: bigint;
  fundingSnapshot: bigint;
}

export interface PhoenixTraderState {
  collateral: bigint;
  capabilities: number;
  hot: boolean;
  withdrawQueued: boolean;
  positions: PhoenixPosition[];
}

const enc = (s: string) => Buffer.from(s, "utf8");

function arenaKeys(header: string, count: number, seed: string): string[] {
  const extra: string[] = [];
  for (let i = 0; i < Math.max(count - 1, 0); i++) {
    extra.push(findPda([enc(seed), Uint8Array.of(i + 1)], PHOENIX_PROGRAM_ID));
  }
  return [header, ...extra];
}

// Ported from apps/solana/lib/solana/phoenix.ts:readPhoenixExchange
let exchangeCache: { at: number; v: Promise<PhoenixExchangeState> } | null = null;
export function readPhoenixExchange(): Promise<PhoenixExchangeState> {
  if (exchangeCache && Date.now() - exchangeCache.at < 60_000) return exchangeCache.v;
  const v = readPhoenixExchangeNow();
  exchangeCache = { at: Date.now(), v };
  v.catch(() => (exchangeCache = null));
  return v;
}
async function readPhoenixExchangeNow(): Promise<PhoenixExchangeState> {
  const info = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [
    PHOENIX_EXCHANGE,
    { encoding: "base64" },
  ]);
  if (!info?.value) throw new Error("Phoenix exchange not found on this network");
  const d = Buffer.from(info.value.data[0], "base64");

  const keyAt = (offset: number) => base58(d.subarray(offset, offset + 32));
  const traderHeader = keyAt(392);
  const bufferHeader = keyAt(424);

  const arenasInfo = await rpc<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [
    [traderHeader, bufferHeader],
    { encoding: "base64" },
  ]);

  const tAcc = arenasInfo?.value?.[0];
  const bAcc = arenasInfo?.value?.[1];

  const tCount = tAcc ? Buffer.from(tAcc.data[0], "base64").readUInt16LE(52) : 1;
  const bCount = bAcc ? Buffer.from(bAcc.data[0], "base64").readUInt16LE(52) : 1;

  const emberState = findPda([decode58(PHOENIX_PROGRAM_ID), enc("state")], EMBER_PROGRAM_ID);
  const emberVault = findPda([decode58(PHOENIX_PROGRAM_ID), enc("vault")], EMBER_PROGRAM_ID);

  return {
    canonicalMint: keyAt(296),
    globalVault: keyAt(328),
    perpAssetMap: keyAt(360),
    traderIndex: arenaKeys(traderHeader, tCount, "global_trader_index"),
    activeBuffer: arenaKeys(bufferHeader, bCount, "active_trader_buffer"),
    withdrawQueue: keyAt(472),
    emberState,
    emberVault,
  };
}

// Ported from apps/solana/lib/solana/phoenix.ts:decodePerpAssetMap
export function decodePerpAssetMap(data: Buffer): PhoenixMarketState[] {
  const markets: PhoenixMarketState[] = [];
  const assetCount = data.readUInt32LE(32);
  for (let i = 0; i < assetCount; i++) {
    const base = 48 + 1584 * i;
    const meta = base + 16;
    if (data.length < meta + 1568 || data[meta + 1450] !== 0 || data[meta + 1567] !== 0) continue;
    const orderbook = base58(data.subarray(meta + 904, meta + 936));
    const spline = findPda([enc("spline"), decode58(orderbook)], PHOENIX_PROGRAM_ID);
    markets.push({
      // toString(enc, start, end) on the Buffer itself: on the phone subarray() returns a plain Uint8Array, whose toString is "1,2,3"
      symbol: data.toString("utf8", base, base + 16).replace(/\0+$/, ""),
      assetId: data.readUInt16LE(meta + 944) | (data.readUInt16LE(meta + 948) << 16),
      orderbook,
      spline,
      tickSize: data.readBigUInt64LE(meta + 936),
      lotDecimals: data.readInt8(meta + 946),
      markTicks: data.readBigUInt64LE(meta + 24),
      cumulativeFunding: data.readBigInt64LE(meta + 1312),
      isolatedOnly: data[meta + 1208] !== 0,
      afterHours: (data[base + 1472] & 0b110) !== 0,
    });
  }
  return markets;
}

// Ported from apps/solana/lib/solana/phoenix.ts:fetchPerpAssetMap
// The perp asset map is ~1.6 MB (110 markets): each read is a multi-second download and parse, on a phone more. Cached 15 s;
// copyOntoForkTimeline puts the copy it writes here, so a read right after a refresh costs nothing.
const perpMapCache = new Map<string, { at: number; v: PhoenixMarketState[] }>();
export async function fetchPerpAssetMap(perpAssetMapPda: string): Promise<PhoenixMarketState[]> {
  const hit = perpMapCache.get(perpAssetMapPda);
  if (hit && Date.now() - hit.at < 15_000) return hit.v;
  const v = await fetchPerpAssetMapNow(perpAssetMapPda);
  if (v.length) perpMapCache.set(perpAssetMapPda, { at: Date.now(), v });
  return v;
}
async function fetchPerpAssetMapNow(perpAssetMapPda: string): Promise<PhoenixMarketState[]> {
  const info = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [
    perpAssetMapPda,
    { encoding: "base64" },
  ]);
  if (!info?.value) return [];
  return decodePerpAssetMap(decodeBase64(info.value.data[0]));
}

// Ported from apps/solana/lib/solana/phoenix.ts:decodeTrader
export function decodeTrader(data: Buffer): PhoenixTraderState {
  const positions: PhoenixPosition[] = [];
  const len = Number(data.readBigUInt64LE(224));
  const EXTENSION_KEY = 0xff000000n;
  for (let j = 0; j < len; j++) {
    const at = 240 + 40 * j;
    if (data.length < at + 40) break;
    const entry = data.readBigUInt64LE(at);
    if (entry >= EXTENSION_KEY) continue;
    positions.push({
      assetId: Number(entry & 0xffffffffn),
      baseLots: data.readBigInt64LE(at + 8),
      virtualQuoteLots: data.readBigInt64LE(at + 16),
      fundingSnapshot: data.readBigInt64LE(at + 24),
    });
  }
  const flags = data.readUInt32LE(TRADER_FLAGS_OFFSET);
  return {
    collateral: data.readBigInt64LE(88),
    capabilities: flags & FULL_TRADER_CAPABILITIES,
    hot: (flags & 1) !== 0,
    withdrawQueued: data.readUInt32LE(108) !== 0,
    positions,
  };
}

// Ported from apps/solana/lib/solana/phoenix.ts:phoenixMarketBook
export const phoenixMarketBook = (): string => findPda(["market_book", decode58(PHOENIX_EXCHANGE)], ORACLE_PROGRAM_ID);

// Ported from apps/solana/lib/solana/phoenix.ts:MarketBookEntry
export interface MarketBookEntry {
  market: string;
  assetId: number;
  maxLeverageBps: number;
  tradingEnabled: boolean;
  indexPrice: OracleConfigState;
}

// Ported from apps/solana/lib/solana/phoenix.ts:MarketBookState
export interface MarketBookState {
  address: string;
  venue: string;
  program: string;
  collateralMint: string;
  collateralDecimals: number;
  collateralPrice: OracleConfigState;
  markets: MarketBookEntry[];
}

// Ported from apps/solana/lib/solana/phoenix.ts:decodeMarketBook
export function decodeMarketBook(data: Buffer): MarketBookState {
  const count = data[106];
  const markets: MarketBookEntry[] = [];
  for (let i = 0; i < count; i++) {
    const at = 292 + 228 * i;
    markets.push({
      market: base58(data.subarray(at, at + 32)),
      assetId: data.readUInt32LE(at + 32),
      maxLeverageBps: data.readUInt32LE(at + 36),
      tradingEnabled: data[at + 40] !== 0,
      indexPrice: decodeOracleConfig(data, at + 44),
    });
  }
  return {
    address: phoenixMarketBook(),
    venue: base58(data.subarray(8, 40)),
    program: base58(data.subarray(40, 72)),
    collateralMint: base58(data.subarray(72, 104)),
    collateralDecimals: data[104],
    collateralPrice: decodeOracleConfig(data, 108),
    markets,
  };
}

// Ported from apps/solana/lib/solana/phoenix.ts:phoenixOracleAccounts
export function phoenixOracleAccounts(
  margin: string,
  ex: PhoenixExchangeState,
  book: MarketBookState,
  assetIds: number[]
): string[] {
  const keys: string[] = [
    book.address,
    PHOENIX_EXCHANGE,
    ex.perpAssetMap,
    phoenixTraderPda(margin),
    ...oracleAccounts(book.collateralPrice),
  ];
  for (const id of new Set(assetIds)) {
    const entry = book.markets.find((m) => m.assetId === id);
    if (entry) {
      keys.push(entry.market, ...oracleAccounts(entry.indexPrice));
    }
  }
  return keys;
}

// Ported from apps/solana/lib/solana/phoenix.ts:phoenixValidatorAccounts
export function phoenixValidatorAccounts(book: MarketBookState, assetIds: number[] = []): AccountMeta[] {
  const ro = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: false });
  const keys: string[] = [book.address, PHOENIX_EXCHANGE];
  for (const id of new Set(assetIds)) {
    const entry = book.markets.find((m) => m.assetId === id);
    if (entry) {
      keys.push(entry.market, ...oracleAccounts(entry.indexPrice));
    }
  }
  return keys.map(ro);
}

// Helper to fetch Phoenix oracle accounts for health check
export async function fetchPhoenixOracleAccounts(margin: string, extraAssetIds: number[] = []): Promise<string[]> {
  try {
    const [ex, bookInfo, traderInfo] = await Promise.all([
      readPhoenixExchange(),
      rpc<{ value: { data: [string, string] } }>("getAccountInfo", [phoenixMarketBook(), { encoding: "base64" }]),
      rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [phoenixTraderPda(margin), { encoding: "base64" }]),
    ]);
    if (!bookInfo?.value) return [];
    const book = decodeMarketBook(Buffer.from(bookInfo.value.data[0], "base64"));
    const assetIds = [...extraAssetIds];
    if (traderInfo?.value) {
      const trader = decodeTrader(Buffer.from(traderInfo.value.data[0], "base64"));
      for (const p of trader.positions) {
        if (p.baseLots !== 0n || p.virtualQuoteLots !== 0n) assetIds.push(p.assetId);
      }
    }
    return phoenixOracleAccounts(margin, ex, book, assetIds);
  } catch {
    return [];
  }
}

// Ported from apps/solana/lib/solana/phoenix.ts:usdToTicks
export function usdToTicks(m: { tickSize: bigint; lotDecimals: number }, usd: number): bigint {
  return BigInt(Math.max(1, Math.round((usd * 1e6) / (Number(m.tickSize) * 10 ** m.lotDecimals))));
}

// Ported from apps/solana/lib/solana/phoenix.ts:ticksToUsd
export function ticksToUsd(m: { tickSize: bigint; lotDecimals: number }, ticks: bigint): number {
  return (Number(ticks) * Number(m.tickSize) * 10 ** m.lotDecimals) / 1e6;
}

// Ported from apps/solana/lib/solana/phoenix.ts:marketOrderData
export function marketOrderData(o: {
  side: number;
  priceInTicks: bigint;
  lots: bigint;
  reduceOnly: boolean;
  minBaseLotsToFill?: bigint;
}): Buffer {
  const u64 = (v: bigint | number) => {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(BigInt(v));
    return b;
  };
  const option = (v: bigint | null) => (v === null ? Buffer.from([0]) : Buffer.concat([Buffer.from([1]), u64(v)]));
  return Buffer.concat([
    Buffer.from(PLACE_MARKET_ORDER),
    Buffer.from([IMMEDIATE_OR_CANCEL, o.side]),
    option(o.priceInTicks),
    u64(o.lots),
    option(null),
    u64(o.minBaseLotsToFill ?? 0n),
    u64(0),
    Buffer.from([0]),
    option(null),
    Buffer.alloc(16),
    option(null),
    Buffer.from([o.reduceOnly ? REDUCE_ONLY : 0, 0]),
  ]);
}

// Ported from apps/solana/lib/solana/phoenix.ts:emberAccounts
export function emberAccounts(ex: PhoenixExchangeState, margin: string, usdc: string): AccountMeta[] {
  const ro = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: false });
  const w = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: true });
  return [
    ro(margin),
    ro(ex.emberState),
    ro(usdc),
    w(ex.canonicalMint),
    w(marginVault(margin, usdc, TOKEN_PROGRAM_ID)),
    w(marginVault(margin, ex.canonicalMint, TOKEN_PROGRAM_ID)),
    w(ex.emberVault),
    ro(TOKEN_PROGRAM_ID),
  ];
}

function phoenixHead(margin: string): AccountMeta[] {
  const ro = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: false });
  const w = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: true });
  return [ro(PHOENIX_PROGRAM_ID), ro(PHOENIX_LOG_AUTHORITY), w(PHOENIX_EXCHANGE), ro(margin)];
}

const phoenixArenas = (ex: PhoenixExchangeState) =>
  [...ex.traderIndex, ...ex.activeBuffer].map((k) => ({ pubkey: k, isSigner: false, isWritable: true }));

// Ported from apps/solana/lib/solana/phoenix.ts:depositAccounts
export function depositAccounts(ex: PhoenixExchangeState, margin: string): AccountMeta[] {
  const ro = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: false });
  const w = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: true });
  return [
    ...phoenixHead(margin),
    w(marginVault(margin, ex.canonicalMint, TOKEN_PROGRAM_ID)),
    w(phoenixTraderPda(margin)),
    w(ex.globalVault),
    ro(TOKEN_PROGRAM_ID),
    ...phoenixArenas(ex),
  ];
}

// Ported from apps/solana/lib/solana/phoenix.ts:withdrawAccounts
export function withdrawAccounts(ex: PhoenixExchangeState, margin: string): AccountMeta[] {
  const ro = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: false });
  const w = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: true });
  return [
    ...phoenixHead(margin),
    w(phoenixTraderPda(margin)),
    w(ex.perpAssetMap),
    w(ex.globalVault),
    w(marginVault(margin, ex.canonicalMint, TOKEN_PROGRAM_ID)),
    ro(TOKEN_PROGRAM_ID),
    ...phoenixArenas(ex),
    w(ex.withdrawQueue),
  ];
}

// Ported from apps/solana/lib/solana/phoenix.ts:orderAccounts
export function orderAccounts(
  ex: PhoenixExchangeState,
  margin: string,
  market: { orderbook: string; spline: string }
): AccountMeta[] {
  const w = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: true });
  return [
    ...phoenixHead(margin),
    w(phoenixTraderPda(margin)),
    w(ex.perpAssetMap),
    ...phoenixArenas(ex),
    w(market.orderbook),
    w(market.spline),
  ];
}

// Ported from apps/solana/lib/solana/phoenix.ts:registerTraderIx
export function registerTraderIx(payer: string, margin: string): RawInstruction {
  const data = Buffer.alloc(8 + 4 + 4 + 2);
  Buffer.from(REGISTER_TRADER).copy(data, 0);
  data.writeUInt32LE(128, 8);
  data.writeUInt32LE(0, 12);
  const ro = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: false });
  const w = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: true });
  return {
    programId: PHOENIX_PROGRAM_ID,
    keys: [
      ro(PHOENIX_PROGRAM_ID),
      ro(PHOENIX_LOG_AUTHORITY),
      ro(PHOENIX_EXCHANGE),
      { pubkey: payer, isSigner: true, isWritable: true },
      ro(margin),
      w(phoenixTraderPda(margin)),
      ro(SYSTEM_PROGRAM_ID),
    ],
    data,
  };
}

// Ported from apps/solana/lib/solana/server/perps-keeper.ts:grantPhoenixCapabilitiesOnFork
// Fork only: a fresh Phoenix trader gets the capabilities the exchange's keeper would grant on mainnet.
export async function grantPhoenixCapabilitiesOnFork(margin: string): Promise<void> {
  const trader = phoenixTraderPda(margin);
  const traderInfo = await rpc<{ value: { data: [string, string]; lamports: number } | null }>("getAccountInfo", [
    trader,
    { encoding: "base64" },
  ]);
  if (!traderInfo?.value) return;
  const data = Buffer.from(traderInfo.value.data[0], "base64");
  if (data.length < TRADER_FLAGS_OFFSET + 4) return;
  const flags = data.readUInt32LE(TRADER_FLAGS_OFFSET);
  if ((flags & FULL_TRADER_CAPABILITIES) === FULL_TRADER_CAPABILITIES) return;
  data.writeUInt32LE(flags | FULL_TRADER_CAPABILITIES, TRADER_FLAGS_OFFSET);
  await rpc("surfnet_setAccount", [
    trader,
    { lamports: traderInfo.value.lamports, data: data.toString("hex"), owner: PHOENIX_PROGRAM_ID, executable: false, rentEpoch: 0 },
  ]);
}

// Ported from apps/solana/lib/solana/server/perps-keeper.ts:ensurePerpsLookupTable
export async function ensurePerpsLookupTableOnFork(
  owner: string,
  margin: string,
  assetMap: Map<number, AssetConfigState>,
  book: MarketBookState,
  ex: PhoenixExchangeState,
  splines: PhoenixMarketState[]
): Promise<string> {
  const lutAddress = createWithSeed(margin, "vanna-perps-lookup", ADDRESS_LOOKUP_TABLE_PROGRAM);

  const assets = [...assetMap.values()];
  const keys: string[] = [
    VANNA_PROGRAM_ID,
    ORACLE_PROGRAM_ID,
    VALIDATOR_PROGRAM_ID,
    PHOENIX_PROGRAM_ID,
    EMBER_PROGRAM_ID,
    KLEND_PROGRAM_ID,
    JUPITER_V6_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    SYSTEM_PROGRAM_ID,
    COMPUTE_BUDGET_PROGRAM_ID,
    protocolConfigPda(),
    findPda(["price_book"], ORACLE_PROGRAM_ID),
    ...[PHOENIX_PROGRAM_ID, EMBER_PROGRAM_ID, KLEND_PROGRAM_ID, JUPITER_V6_PROGRAM_ID].map((p) => integrationPda(p)),
    ...assets.flatMap((a) => [a.address, ...a.oracleAccounts]),
    ...assets.filter((a) => a.kind === "token").map((a) => a.mint),
    margin,
    book.address,
    PHOENIX_EXCHANGE,
    PHOENIX_LOG_AUTHORITY,
    ex.canonicalMint,
    ex.globalVault,
    ex.perpAssetMap,
    ex.withdrawQueue,
    ex.emberState,
    ex.emberVault,
    ...ex.traderIndex,
    ...ex.activeBuffer,
    phoenixTraderPda(margin),
    marginVault(margin, ex.canonicalMint, TOKEN_PROGRAM_ID),
    ...oracleAccounts(book.collateralPrice),
  ];

  for (const m of book.markets) {
    keys.push(m.market, ...oracleAccounts(m.indexPrice));
    const spline = splines.find((s) => s.orderbook === m.market)?.spline;
    if (spline) keys.push(spline);
  }

  for (const t of TOKENS) {
    keys.push(marginVault(margin, t.mint, t.tokenProgram));
    if (t.lendable) {
      keys.push(reservePda(t.mint), reserveVault(t.mint, t.tokenProgram), debtPositionPda(margin, reservePda(t.mint)));
    }
  }

  for (const r of Object.values(KAMINO_RECEIPTS)) {
    keys.push(marginVault(margin, r.collateralMint, TOKEN_PROGRAM_ID));
  }

  const uniqueKeys = [...new Set(keys)].slice(0, 256);

  const data = Buffer.alloc(56 + 32 * uniqueKeys.length);
  data.writeUInt32LE(1, 0); // state: 1 = table
  data.writeBigUInt64LE(0xffffffffffffffffn, 4);
  data.writeBigUInt64LE(0n, 12);
  data[20] = Math.min(255, uniqueKeys.length);

  uniqueKeys.forEach((key, i) => {
    Buffer.from(decode58(key)).copy(data, 56 + 32 * i);
  });

  await rpc("surfnet_setAccount", [
    lutAddress,
    {
      lamports: 10_000_000,
      data: data.toString("hex"),
      owner: ADDRESS_LOOKUP_TABLE_PROGRAM,
      executable: false,
      rentEpoch: 0,
    },
  ]).catch(() => {});

  return lutAddress;
}

// Ported from apps/solana/lib/solana/server/perps-keeper.ts:refreshBook
export async function refreshPhoenixBookOnFork(
  marketKey: string,
  ex: PhoenixExchangeState,
  splines: PhoenixMarketState[]
): Promise<void> {
  return refreshPhoenixBooksOnFork([marketKey], ex, splines);
}

/**
 * Several markets at once (Close all): each orderbook re-cloned, and every spline plus the perp asset map copied onto the fork's
 * timeline in ONE copy (the asset map is 100+ KB and holds every market's mark price, so one copy serves all of them).
 */
async function refreshPhoenixBooksOnFork(marketKeys: string[], ex: PhoenixExchangeState, splines: PhoenixMarketState[]): Promise<void> {
  const ms = marketKeys
    .map((k) => k.toUpperCase().replace(/-PERP$/, ""))
    .flatMap((k) => splines.filter((s) => s.symbol.toUpperCase() === k));
  if (!ms.length) return;
  // The orderbook is re-cloned as is. The spline and the perp asset map (mark price + its oracle slots/times) are copied from
  // mainnet onto the fork's timeline: the fork runs ahead of mainnet, so a plain re-clone carries slots Phoenix rejects as stale
  // ("Cannot get mark price, staleness or validity check failed" -> InvalidAccountData).
  await Promise.all([...ms.map((m) => rpc("surfnet_resetAccount", [m.orderbook])), copyOntoForkTimeline([...ms.map((m) => m.spline), ex.perpAssetMap])]);
}

// Ported from apps/solana/lib/solana/server/perps-keeper.ts:copyOntoForkTimeline (backend main, round-2 update).
const PHOENIX_MAINNET_RPC = "https://api.mainnet-beta.solana.com";
const SLOT_REBASE_WINDOW = 5_000_000;
const TIME_REBASE_WINDOW_S = 30 * 24 * 3600;
const TIME_REBASE_AHEAD_S = 7 * 24 * 3600;
// Keeps the copied price fresh through a wallet approval. The fork makes ~4.5 slots a second (measured 2026-11-18), so 150 slots
// lasted only ~35 s: a BTC-PERP close built from a 25 s old copy failed its pre-send check. 300 slots = ~65 s (400 tested fine).
const REBASE_LOOKAHEAD_SLOTS = 300;
const REBASE_LOOKAHEAD_S = 60;
async function copyOntoForkTimeline(keys: string[]): Promise<void> {
  const mainnet = async <T,>(method: string, params: unknown[]): Promise<T> => {
    const res = await fetch(PHOENIX_MAINNET_RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
    const body = (await res.json()) as { result?: T; error?: { message?: string } };
    if (body.error || body.result === undefined) throw new Error(body.error?.message ?? "Mainnet RPC error");
    return body.result;
  };
  type Info = { lamports: number; owner: string; data: [string, string] } | null;
  const [forkSlot, forkClock, read] = await Promise.all([
    rpc<number>("getSlot", [{ commitment: "processed" }]),
    forkNow(),
    mainnet<{ context: { slot: number }; value: Info[] }>("getMultipleAccounts", [keys, { encoding: "base64", commitment: "processed" }]),
  ]);
  const mainSlot = read.context.slot;
  const now = Math.floor(Date.now() / 1000);
  const slotDelta = BigInt(Math.max(0, forkSlot - mainSlot) + REBASE_LOOKAHEAD_SLOTS);
  const timeDelta = BigInt(Math.max(0, Number(forkClock) - now) + REBASE_LOOKAHEAD_S);
  const slotLow = BigInt(mainSlot - SLOT_REBASE_WINDOW), slotHigh = BigInt(mainSlot + 1_000);
  const secLow = BigInt(now - TIME_REBASE_WINDOW_S), secHigh = BigInt(now + TIME_REBASE_AHEAD_S);
  const msLow = secLow * 1000n, msHigh = secHigh * 1000n;
  await Promise.all(read.value.map(async (info, i) => {
    if (!info) throw new Error(`${keys[i]} not found on mainnet`);
    const data = decodeBase64(info.data[0]);
    // Every window lies far below 2^53, so a word whose high half is >= 2^21 can never match: skip it without building a BigInt
    // (the perp asset map is 100+ KB, ~13,000 words; BigInt reads of each were slow on Hermes). Matching words are unchanged.
    const lowestWindow = Math.min(Number(slotLow), Number(secLow), Number(msLow));
    for (let o = 0; o + 8 <= data.length; o += 8) {
      const hi = data.readUInt32LE(o + 4);
      if (hi >= 0x200000 || hi * 4294967296 + data.readUInt32LE(o) < lowestWindow) continue;
      const v = data.readBigUInt64LE(o);
      if (v >= slotLow && v <= slotHigh) data.writeBigUInt64LE(v + slotDelta, o);
      else if (v >= secLow && v <= secHigh) data.writeBigUInt64LE(v + timeDelta, o);
      else if (v >= msLow && v <= msHigh) data.writeBigUInt64LE(v + timeDelta * 1000n, o);
    }
    await rpc("surfnet_setAccount", [keys[i], { lamports: info.lamports, data: data.toString("hex"), owner: info.owner, executable: false, rentEpoch: 0 }]);
    if (data.length > 100_000) {
      const decoded = decodePerpAssetMap(data);
      if (decoded.length) perpMapCache.set(keys[i], { at: Date.now(), v: decoded });
    }
  }));
}

// Ported from apps/solana/lib/solana/perps.ts:openPerp
// Spot tokens Jupiter prices for each Phoenix market's index (web fork-prices.ts:PERP_INDEX_PROXY).
const PERP_INDEX_PROXY: Record<string, string> = {
  ETH: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  BTC: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
  SOL: "So11111111111111111111111111111111111111112",
  TSLA: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
  META: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu",
};
const MAX_CLOSE_SLIPPAGE_BPS = 500;
const lotsToTokens = (lots: bigint, lotDecimals: number) => Number(lots) / 10 ** lotDecimals;

interface PerpsContext {
  owner: string;
  margin: string;
  ex: PhoenixExchangeState;
  book: MarketBookState;
  splines: PhoenixMarketState[];
  assetMap: Map<number, AssetConfigState>;
  trader: PhoenixTraderState | null;
  openAssetIds: number[];
  venueIndex: number;
}

// Ported from apps/solana/lib/solana/perps.ts:loadPerpsContext
// Perps transactions use only public mainnet lookup tables (PHOENIX_MAINNET_TABLES), never the old fork-only perps table
// (ensurePerpsLookupTableOnFork): wallets read tables from real mainnet, and Phantom hangs on one that only exists on the fork.
async function loadPerps(owner: string): Promise<PerpsContext> {
  const margin = marginPda(owner);
  const [ex, bookInfo, assetMap, traderInfo] = await Promise.all([
    readPhoenixExchange(),
    rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [phoenixMarketBook(), { encoding: "base64" }]),
    readAllAssetConfigs(),
    rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [phoenixTraderPda(margin), { encoding: "base64" }]),
  ]);
  if (!bookInfo?.value) throw new Error("Phoenix markets aren't listed on this network yet");
  const book = decodeMarketBook(Buffer.from(bookInfo.value.data[0], "base64"));
  const splines = await fetchPerpAssetMap(ex.perpAssetMap);
  const trader = traderInfo?.value ? decodeTrader(Buffer.from(traderInfo.value.data[0], "base64")) : null;
  if (trader && (trader.hot || trader.withdrawQueued)) throw new Error("This Phoenix account has a queued withdrawal; try again shortly");
  const venue = [...assetMap.values()].find((a) => a.mint === PHOENIX_EXCHANGE);
  if (!venue) throw new Error("The Phoenix venue is not registered with the protocol");
  return {
    owner, margin, ex, book, splines, assetMap, trader,
    openAssetIds: (trader?.positions ?? []).filter((x) => x.baseLots !== 0n).map((x) => x.assetId),
    venueIndex: venue.assetIndex,
  };
}

type HealthOpts = { pendingVenue?: number; closedVenue?: number; pendingCollateral?: number[]; onlyAssets?: number[]; venueScan?: boolean };

// A call at Phoenix always names the venue and gives the validator the target market plus every open position.
// Health accounts are compact (held tokens only), so the call fits a transaction with mainnet tables.
function phoenixCall(
  p: PerpsContext,
  data: Buffer,
  accounts: AccountMeta[],
  targets: number[],
  pricedMints: string[],
  health: HealthOpts = {}
) {
  return marginExecuteIx(
    p.owner, PHOENIX_PROGRAM_ID, data, accounts, assetConfigPda(PHOENIX_EXCHANGE),
    phoenixValidatorAccounts(p.book, [...targets, ...p.openAssetIds]), pricedMints,
    { extraAssetIds: targets, venueScan: true, compact: true, ...health }
  );
}

const amountData = (selector: number[], amount: bigint) => {
  const data = Buffer.alloc(16);
  Buffer.from(selector).copy(data, 0);
  data.writeBigUInt64LE(amount, 8);
  return data;
};

const tokenIndex = (p: PerpsContext, mint: string) => [...p.assetMap.values()].find((a) => a.mint === mint && a.kind !== "venue")?.assetIndex;

/**
 * FORK ONLY. Puts Phoenix's market data and every price a perps call checks onto the fork's clock: the market's orderbook,
 * spline and the perp asset map (Phoenix's mark price, rejected after ~150 slots), and Vanna's index and collateral oracles
 * (Pyth + Scope, max age 120 s for SOL-PERP's index, 180 s for USDC). Run when building AND right before a signed perps
 * transaction is sent: a slow wallet approval (2.5 min on 2026-11-18) left the index 3 min old ("index price is stale").
 * `key` null: only the perp asset map (withdraw).
 */
// `force` (a check just failed): always refresh. Otherwise a refresh of the same market less than PERPS_FRESH_MS ago is reused:
// the copied mark stays valid REBASE_LOOKAHEAD_SLOTS (~65 s on the fork) and the index 120 s, so a part sent seconds after the
// previous refresh is safe. A pre-send check that still finds it stale forces a refresh and checks again (sendSolanaBatch).
// 40 s: the second part of a batch is sent ~25 s after the first part's refresh on a slow device (a refresh costs 25-40 s there), well inside the ~65 s the copy stays valid.
const PERPS_FRESH_MS = 40_000;
// When each market was last refreshed (its orderbook re-cloned, the asset map copied, the prices stamped), and when anything was.
const perpsRefreshedAt = new Map<string, number>();
let perpsAnyAt = 0;
// `keys` [] = the perp asset map only (withdraw).
let perpsInflight: { keys: string[]; p: Promise<void> } | null = null;
function refreshPerpsOnFork(key: string | null, force = false) {
  return refreshPerpsMarketsOnFork(key === null ? [] : [key], force);
}
/**
 * refreshPerpsOnFork for several markets in ONE pass (Close all): the exchange, market book and asset configs are read once, the
 * orderbooks re-cloned together, the asset map copied once and the prices stamped once, instead of one full refresh per market.
 */
async function refreshPerpsMarketsOnFork(keys: string[], force = false): Promise<{ ex: PhoenixExchangeState; book: MarketBookState; splines: PhoenixMarketState[]; assetMap: Map<number, AssetConfigState> }> {
  const [ex, bookInfo, assetMap] = await Promise.all([
    readPhoenixExchange(),
    rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [phoenixMarketBook(), { encoding: "base64" }]),
    readAllAssetConfigs(),
  ]);
  if (!bookInfo?.value) throw new Error("Phoenix markets aren't listed on this network yet");
  const book = decodeMarketBook(Buffer.from(bookInfo.value.data[0], "base64"));
  const before = await fetchPerpAssetMap(ex.perpAssetMap);
  const isFresh = (k: string) => Date.now() - (perpsRefreshedAt.get(k) ?? 0) < PERPS_FRESH_MS;
  const fresh = !force && (keys.length ? keys.every(isFresh) : Date.now() - perpsAnyAt < PERPS_FRESH_MS);
  const inflight = perpsInflight;
  if (!fresh && !force && inflight && (keys.length === 0 || keys.every((k) => inflight.keys.includes(k)))) {
    // The sheet's prewarm (or another part) is refreshing these markets right now: wait for it instead of starting another.
    await inflight.p.catch(() => {});
  } else if (!fresh) {
    const todo = force ? keys : keys.filter((k) => !isFresh(k));
    const indexes = book.markets.flatMap((e) => {
      const symbol = before.find((s) => s.assetId === e.assetId)?.symbol;
      return symbol && PERP_INDEX_PROXY[symbol] ? [{ symbol, mint: PERP_INDEX_PROXY[symbol], oracle: e.indexPrice }] : [];
    });
    // The market copy and the price stamps touch different accounts: in parallel.
    const p = Promise.all([
      todo.length ? refreshPhoenixBooksOnFork(todo, ex, before) : copyOntoForkTimeline([ex.perpAssetMap]),
      ensureFreshForkPrices(TOKENS, assetMap, indexes, true),
    ]).then(() => {
      const at = Date.now();
      perpsAnyAt = at;
      todo.forEach((k) => perpsRefreshedAt.set(k, at));
    });
    perpsInflight = { keys: todo, p };
    try {
      await p;
    } finally {
      if (perpsInflight?.p === p) perpsInflight = null;
    }
  }
  const splines = await fetchPerpAssetMap(ex.perpAssetMap);
  return { ex, book, splines, assetMap };
}

/**
 * Called when a perps order sheet OPENS (before the person taps): copies the market and stamps the prices on the fork, and
 * loads the asset configs and the wallet-safe Phoenix tables, so the tap finds them ready (each step is 1 to 5 s on the fork RPC).
 * Only fork writes of public market data and reads; nothing is signed. Errors are ignored (the tap does the same work again).
 */
export function prewarmPerps(market: string, owner?: string): void {
  const key = market.toUpperCase().replace(/-PERP$/, "");
  void Promise.all([
    refreshPerpsOnFork(key),
    walletSafeLookupTables(PHOENIX_MAINNET_TABLES, owner),
    owner ? rpc("getAccountInfo", [phoenixTraderPda(marginPda(owner)), { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]) : null,
  ]).catch(() => {});
}

async function freshPerpsMarket(market: string): Promise<{ key: string; spline: PhoenixMarketState; entry: MarketBookEntry }> {
  const key = market.toUpperCase().replace(/-PERP$/, "");
  const { book, splines } = await refreshPerpsOnFork(key);
  const spline = splines.find((s) => s.symbol.toUpperCase() === key);
  const entry = spline && book.markets.find((m) => m.assetId === spline.assetId);
  if (!spline || !entry) throw new Error(`${key}-PERP is not a listed Phoenix market`);
  return { key, spline, entry };
}

/**
 * Each Phoenix market's maximum leverage from Vanna's market book on chain (maxLeverageBps; the validator rejects an order above
 * it and the website's order panel uses the same value), keyed by symbol ("SOL", "TSLA"...). Read only, nothing is written.
 */
export async function readPerpMaxLeverage(): Promise<Record<string, number>> {
  const [ex, bookInfo] = await Promise.all([
    readPhoenixExchange(),
    rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [phoenixMarketBook(), { encoding: "base64" }]),
  ]);
  if (!bookInfo?.value) return {};
  const book = decodeMarketBook(Buffer.from(bookInfo.value.data[0], "base64"));
  const splines = await fetchPerpAssetMap(ex.perpAssetMap);
  const out: Record<string, number> = {};
  for (const e of book.markets) {
    const symbol = splines.find((s) => s.assetId === e.assetId)?.symbol?.toUpperCase();
    if (symbol && e.maxLeverageBps > 0) out[symbol] = e.maxLeverageBps / 10_000;
  }
  return out;
}

/**
 * A perps open that stopped half way: the USDC is safe but backs no new position. `where` = "margin": converted to phUSD and still
 * in the margin account (the deposit + order transaction did not land; opening again uses it without converting more);
 * "phoenix": deposited in Phoenix as collateral (only the old deposit-then-order fallback can leave it there).
 */
export class PerpsOpenIncompleteError extends Error {
  readonly where: "margin" | "phoenix";
  readonly usdc: number;
  constructor(message: string, where: "margin" | "phoenix", usdc: number) {
    super(message);
    this.name = "PerpsOpenIncompleteError";
    this.where = where;
    this.usdc = usdc;
  }
}

// Ported from apps/solana/lib/solana/perps.ts:openPerp
// ONE wallet approval. The USDC only enters Phoenix in the SAME transaction as the order (deposit + market order with a minimum
// fill of one lot), so a failed or unfilled order moves nothing into Phoenix. Shapes, first that fits 1,232 bytes with wallet-safe
// tables: [convert USDC to phUSD + deposit + order] in one transaction (fully atomic), else [convert] then [deposit + order]
// (if the second fails, the phUSD waits in the margin account and the next open uses it), else the old deposit-then-order split.
// Before the wallet is asked (and again before sending when the approval was slow), the whole open is simulated as one transaction
// on the fork, so nothing is signed when the order would fail. First time only: [register the Phoenix trader] goes first.
export async function solanaPerpsOpen(opts: {
  market: string;
  side: "long" | "short";
  collateralUsdc: number | string;
  leverage: number;
  slippageBps?: number;
  // Size the order on this much USDC instead of the amount added (retrying an order whose USDC already reached Phoenix, with
  // collateralUsdc 0). Default: the amount added, or all Phoenix collateral when nothing is added.
  sizeOnUsdc?: number | string;
  /** onLeg / cancel / stop (submit.ts BatchControl). */
  control?: BatchControl;
}): Promise<string> {
  const owner = requireActiveRealWallet("solana").full;
  const margin = marginPda(owner);
  const amount = toRaw(opts.collateralUsdc, 6);
  const sizeOn = opts.sizeOnUsdc !== undefined ? toRaw(opts.sizeOnUsdc, 6) : null;
  // Development builds only: where the time goes before the wallet is asked (adb logcat -s ReactNativeJS).
  const t0 = Date.now();
  const mark = (what: string) => {
    if (__DEV__) console.log(`[open-time] ${((Date.now() - t0) / 1000).toFixed(1)}s ${what}`);
  };
  mark("start");
  // The market refresh, the Phoenix state, the trader check (+ its fork capabilities), the margin USDC balance and the phUSD vault
  // check do not depend on each other: all at once instead of one after another (each is one or more fork RPC round trips of
  // ~1 s from a phone). The checks below are the same as before, on the same values.
  const usdcToken = getToken("USDC");
  const usdcVault = marginVault(margin, usdcToken.mint, usdcToken.tokenProgram);
  const perpsP = loadPerps(owner).then((r) => (mark("perps state loaded"), r));
  const [{ key, spline, entry }, p, registered, marginUsdc, phVault] = await Promise.all([
    freshPerpsMarket(opts.market).then((r) => (mark("market refreshed"), r)),
    perpsP,
    rpc<{ value: unknown }>("getAccountInfo", [phoenixTraderPda(margin), { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]).then(async (r) => {
      const known = Boolean(r.value);
      if (known) await grantPhoenixCapabilitiesOnFork(margin);
      mark("trader checked");
      return known;
    }),
    rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [usdcVault]).catch(() => null).then((r) => BigInt(r?.value?.amount ?? "0")),
    // The margin account's phUSD vault: missing = create it; a balance = phUSD left by an open whose order did not land (used first).
    perpsP.then(async (q) => {
      const account = marginVault(margin, q.ex.canonicalMint, TOKEN_PROGRAM_ID);
      const bal = await rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [account]).catch(() => null);
      return { held: BigInt(bal?.value?.amount ?? "0"), create: bal?.value ? [] : await missingAtaIxs(owner, [{ account, wallet: margin, mint: q.ex.canonicalMint, tokenProgram: TOKEN_PROGRAM_ID }]) };
    }),
  ]);
  const createPh = phVault.create;
  // Only what the phUSD already in the margin account does not cover is converted from USDC.
  const wrapAmount = amount > phVault.held ? amount - phVault.held : 0n;

  const maxLev = entry.maxLeverageBps / 10_000;
  if (!entry.tradingEnabled) throw new Error(`${key}-PERP is closed for new positions`);
  if (opts.leverage < 1 || opts.leverage > maxLev) throw new Error(`Leverage must be between 1x and ${maxLev}x`);
  if (wrapAmount > marginUsdc) throw new Error(`Not enough USDC in your margin account (${fromRaw(marginUsdc + phVault.held, 6)} available)`);
  const traderCollateral = (p.trader?.collateral ?? 0n) + amount;
  if (traderCollateral <= 0n) throw new Error("Add USDC to trade on Phoenix");
  if (sizeOn !== null && (sizeOn <= 0n || sizeOn > traderCollateral)) throw new Error(`Only ${fromRaw(traderCollateral, 6)} USDC is in Phoenix`);

  const isLong = opts.side === "long";
  const ref = ticksToUsd(spline, spline.markTicks);
  if (!(ref > 0)) throw new Error(`No price for ${key}-PERP`);
  const slip = (opts.slippageBps ?? 100) / 10_000;
  const limit = isLong ? ref * (1 + slip) : ref * (1 - slip);
  // Size = collateral x leverage valued at the limit price, as the validator does, kept inside the market's cap.
  const sizeUsd = (Number(sizeOn ?? (amount > 0n ? amount : traderCollateral)) / 1e6) * opts.leverage;
  const current = p.trader?.positions.find((x) => x.assetId === spline.assetId)?.baseLots ?? 0n;
  const others = (p.trader?.positions ?? []).filter((x) => x.assetId !== spline.assetId && x.baseLots !== 0n).reduce((t, x) => t + Math.abs(Number(x.virtualQuoteLots)) / 1e6, 0);
  const capUsd = (Number(traderCollateral) / 1e6) * maxLev - others;
  let lots = BigInt(Math.floor((sizeUsd / limit) * 10 ** spline.lotDecimals));
  if (lots <= 0n) throw new Error(`Size too small for ${key}-PERP`);
  const after = (l: bigint) => Math.abs(lotsToTokens(current + (isLong ? l : -l), spline.lotDecimals)) * limit;
  while (lots > 0n && after(lots) > capUsd) lots = (lots * 995n) / 1000n;
  if (lots <= 0n) throw new Error(`Over ${key}-PERP's ${maxLev}x cap. Add collateral or reduce size`);

  const phIdx = tokenIndex(p, p.ex.canonicalMint);
  const usdcIdx = tokenIndex(p, USDC_MINT);
  // Parts after the first run once the earlier ones landed: grant the fresh trader its fork capabilities, and re-copy the
  // market's price so a slow approval does not leave it stale.
  // Every part, right before it is sent (after the approval, which can take minutes): grant the fresh trader its fork
  // capabilities, and re-stamp Phoenix's market data and every oracle the call checks onto the fork clock.
  const freshen = async (retry: boolean) => {
    await Promise.all([registered ? null : grantPhoenixCapabilitiesOnFork(margin), refreshPerpsOnFork(key, retry)]);
  };
  // The instructions of each health-list width (0 = every held token; n = the n least valuable held tokens left out, see
  // healthWidths), built once (each build reads the chain) and shared by every shape below. null: no such width for this account.
  type Built = { wrap: RawInstruction[]; ember: RawInstruction | null; deposit: RawInstruction | null; order: RawInstruction };
  const widths = healthWidths(owner, p.assetMap);
  const builtCache = new Map<number, Promise<Built | null>>();
  const build = (level: number): Promise<Built | null> => {
    const hit = builtCache.get(level);
    if (hit) return hit;
    const made = (async () => {
      const only = await widths(level);
      if (!only) return null;
      // Each call keeps listed the tokens it moves: the convert USDC and phUSD, the deposit phUSD; the order moves none.
      const [order, ember, deposit] = await Promise.all([
        // minBaseLotsToFill 1: an order that would fill nothing fails, and takes the deposit in its transaction with it (checked on the
        // fork: "IOC order does not meet minimum requirements", the whole transaction reverted).
        phoenixCall(
          p,
          marketOrderData({ side: isLong ? BID : ASK, priceInTicks: usdToTicks(spline, limit), lots, reduceOnly: false, minBaseLotsToFill: 1n }),
          orderAccounts(p.ex, margin, spline),
          [spline.assetId],
          [],
          { ...(amount > 0n ? { pendingVenue: p.venueIndex } : {}), onlyAssets: only([]) }
        ),
        wrapAmount > 0n
          ? marginExecuteIx(owner, EMBER_PROGRAM_ID, amountData(EMBER_DEPOSIT, wrapAmount), emberAccounts(p.ex, margin, USDC_MINT), null, [], [USDC_MINT, p.ex.canonicalMint], { compact: true, pendingCollateral: phIdx !== undefined ? [phIdx] : [], onlyAssets: only([usdcIdx, phIdx]) })
          : null,
        // No pendingVenue here: the core expects the venue in the list only once it holds it (checked on the fork: listing it here
        // gives IncompletePositionAccounts). The order after it does list it.
        amount > 0n
          ? phoenixCall(p, amountData(DEPOSIT_FUNDS, amount), depositAccounts(p.ex, margin), [], [p.ex.canonicalMint], { pendingCollateral: phIdx !== undefined ? [phIdx] : [], onlyAssets: only([phIdx]) })
          : null,
      ]);
      return { wrap: [...createPh, ...(ember ? [ember] : [])], ember, deposit, order };
    })();
    builtCache.set(level, made);
    return made;
  };
  const openLabel = `Open ${key}-PERP ${opts.side}`;
  const register: WalletPart[] = registered ? [] : [{ instructions: [registerTraderIx(owner, margin)], label: "Set up Phoenix", before: () => freshenForkPrices() }];
  // "one": everything in one transaction. "wrap-first": convert, then deposit + order (atomic). "deposit-first" / "split": the old
  // fallbacks (the deposit lands before the order; a failed order then leaves the USDC in Phoenix).
  type Shape = "one" | "wrap-first" | "deposit-first" | "split";
  let used: WalletPart[] = [];
  const variant = (level: number, shape: Shape) => async () => {
    const built = await build(level);
    if (!built) return null;
    const { wrap, deposit, order } = built;
    const parts: WalletPart[] = [...register];
    if (!deposit) parts.push({ instructions: [order], label: openLabel, before: freshen });
    else if (shape === "one") parts.push({ instructions: [...wrap, deposit, order], label: openLabel, before: freshen });
    else if (shape === "wrap-first") {
      if (wrap.length) parts.push({ instructions: wrap, label: `Convert USDC for ${key}-PERP`, before: freshen });
      parts.push({ instructions: [deposit, order], label: openLabel, before: freshen });
    } else if (shape === "deposit-first") {
      parts.push({ instructions: [...wrap, deposit], label: `Add USDC for ${key}-PERP`, before: freshen });
      parts.push({ instructions: [order], label: openLabel, before: freshen });
    } else {
      if (wrap.length) parts.push({ instructions: wrap, label: `Add USDC for ${key}-PERP`, before: freshen });
      parts.push({ instructions: [deposit], label: `Add USDC for ${key}-PERP`, before: freshen });
      parts.push({ instructions: [order], label: openLabel, before: freshen });
    }
    used = parts;
    // The order is not in the first transaction: simulate the whole open as one transaction on the fork first (never signed).
    // Not for a first open: the Phoenix account only exists, with its fork capabilities, once "Set up Phoenix" has landed.
    const check = registered && parts.length > 1
      ? () => simulateAsOne(parts.flatMap((x) => x.instructions), owner, { computeUnits: EXEC_COMPUTE_UNITS, lookupTableAddresses: PHOENIX_MAINNET_TABLES, label: openLabel, refresh: freshen })
      : undefined;
    return { parts, check, omits: level > 0 };
  };

  let signature: string;
  try {
    mark("sending");
    // Wide wrap-first before narrow "one": the narrow lists cost another round of chain reads to build, and wrap-first already keeps
    // the USDC out of Phoenix unless the order lands. Measured 2026-11-18 (user's account: USDC + phUSD held, SOL and ETH open):
    // one 1,319 B wide / 1,249 narrow (too large), wrap-first 1,066 + 1,208 wide (fits). With four markets open and a new one
    // (META): wide wrap-first 1,074 + 1,237 B (too large), so the least valuable held token (the USDC left) is dropped first.
    signature = await sendWalletParts(owner, PHOENIX_MAINNET_TABLES, [
      variant(0, "one"), variant(0, "wrap-first"),
      ...NARROW_LEVELS.flatMap((n) => [variant(n, "one"), variant(n, "wrap-first")]),
      variant(0, "deposit-first"), variant(0, "split"),
      ...NARROW_LEVELS.flatMap((n) => [variant(n, "deposit-first"), variant(n, "split")]),
    ], `Open ${key}-PERP`, opts.control);
  } catch (e) {
    if (e instanceof BatchPartError && amount > 0n) {
      const landed = used.slice(0, e.failedIndex).flatMap((x) => x.instructions);
      // Only the widths a variant was built from (the one sent is among them); never starts a new build.
      const builds = await Promise.all([...builtCache.values()].map((b) => b.catch(() => null)));
      const has = (pick: (b: Built) => RawInstruction | null) => builds.some((b) => b && pick(b) && landed.includes(pick(b)!));
      const usdc = Number(fromRaw(amount, 6));
      if (has((b) => b.deposit)) {
        throw new PerpsOpenIncompleteError(`Your ${fromRaw(amount, 6)} USDC reached Phoenix, but the order did not go through: ${e.message}. Retry the order with it, or return it to your margin account.`, "phoenix", usdc);
      }
      if (has((b) => b.ember) || wrapAmount === 0n) {
        throw new PerpsOpenIncompleteError(`The order did not go through, so nothing went to Phoenix: ${e.message}. Your ${fromRaw(amount, 6)} USDC waits in your margin account as phUSD: retry the order (it uses it), or turn it back into USDC.`, "margin", usdc);
      }
      throw new Error(`Your Phoenix account is set up, but the order did not go through: ${e.message}. Nothing else was moved.`);
    }
    throw e;
  }

  // Phoenix market orders fill or cancel inside the transaction: a miss must not look like an open position.
  const filled = (await loadPerps(owner)).trader?.positions.find((x) => x.assetId === spline.assetId)?.baseLots ?? 0n;
  if (filled === current) throw new Error(`No fill at your price limit. Your USDC stays in Phoenix (Tx: ${signature})`);
  return signature;
}

// Ported from apps/solana/lib/solana/perps.ts:withdrawIxs
// Phoenix withdraw (USDC comes back as phUSD) and Ember unwrap (phUSD to USDC), as one or two parts of one approval.
// If only the first lands, the phUSD sits in the margin account (it is collateral there) and Withdraw unwraps it next time.
// `only`: the health-list width (healthWidths).
async function perpsWithdrawParts(p: PerpsContext, amount: bigint, venueEmpties: boolean, only: (keep: (number | undefined)[]) => number[] | undefined, split: boolean, before?: (retry: boolean) => Promise<void>) {
  const phIdx = tokenIndex(p, p.ex.canonicalMint);
  const usdcIdx = tokenIndex(p, USDC_MINT);
  const atas = await missingAtaIxs(p.owner, [
    { account: marginVault(p.margin, p.ex.canonicalMint, TOKEN_PROGRAM_ID), wallet: p.margin, mint: p.ex.canonicalMint, tokenProgram: TOKEN_PROGRAM_ID },
    { account: marginVault(p.margin, USDC_MINT, TOKEN_PROGRAM_ID), wallet: p.margin, mint: USDC_MINT, tokenProgram: TOKEN_PROGRAM_ID },
  ]);
  const withdraw = amount > 0n
    ? [await phoenixCall(p, amountData(WITHDRAW_FUNDS, amount), withdrawAccounts(p.ex, p.margin), [], [p.ex.canonicalMint], { pendingCollateral: phIdx !== undefined ? [phIdx] : [], onlyAssets: only([usdcIdx, phIdx]) })]
    : [];
  // No amount: Ember unwraps the whole phUSD balance.
  const unwrap = await marginExecuteIx(
    p.owner, EMBER_PROGRAM_ID, Buffer.concat([Buffer.from(EMBER_WITHDRAW), Buffer.from([0])]), emberAccounts(p.ex, p.margin, USDC_MINT), null, [],
    [p.ex.canonicalMint, USDC_MINT],
    { ...(venueEmpties ? { closedVenue: p.venueIndex, venueScan: false } : {}), compact: true, pendingCollateral: [usdcIdx, phIdx].filter((x): x is number => x !== undefined), onlyAssets: only([usdcIdx, phIdx]) }
  );
  if (!withdraw.length) return [{ instructions: [...atas, unwrap], label: "Withdraw from Phoenix", before }];
  if (!split) return [{ instructions: [...atas, ...withdraw, unwrap], label: "Withdraw from Phoenix", before }];
  return [
    { instructions: [...atas, ...withdraw], label: "Withdraw from Phoenix", before },
    { instructions: [unwrap], label: "Unwrap phUSD to USDC" },
  ];
}

const perpsWithdrawVariants = (p: PerpsContext, amount: bigint, venueEmpties: boolean, before: (retry: boolean) => Promise<void> = async (retry) => void (await refreshPerpsOnFork(null, retry))) => {
  const widths = healthWidths(p.owner, p.assetMap);
  return [0, ...NARROW_LEVELS].flatMap((level) => [false, true].map((split) => async () => {
    const only = await widths(level);
    return only ? { parts: await perpsWithdrawParts(p, amount, venueEmpties, only, split, before), omits: level > 0 } : null;
  }));
};

/** The close landed but bringing the USDC home did not (the position is closed; the USDC is still in Phoenix). */
export class PerpsCloseWithdrawError extends Error {
  constructor(detail: string) {
    super(`Position closed. The USDC is still in Phoenix: ${detail}`);
    this.name = "PerpsCloseWithdrawError";
  }
}

/**
 * As on the website (closePerp): when the last position is closed, the whole Phoenix balance goes back to the margin account in
 * a second transaction (a second approval). With other positions still open it stays in Phoenix as their collateral.
 */
// `control`: the return is its own approval (cancel / stop / onLeg of that second request).
async function returnUsdcAfterClose(owner: string, signature: string, control?: BatchControl): Promise<string> {
  const after = await loadPerps(owner);
  const open = (after.trader?.positions ?? []).some((x) => x.baseLots !== 0n);
  if (open || (after.trader?.collateral ?? 0n) <= 0n) return signature;
  try {
    return await solanaPerpsWithdraw(undefined, true, control);
  } catch (e) {
    throw new PerpsCloseWithdrawError(e instanceof Error ? e.message : "the withdraw did not go through");
  }
}

// Ported from apps/solana/lib/solana/perps.ts:closePerp
// ONE wallet approval for the close order. As on the website, closing the LAST position then brings the USDC home to the margin
// account in a second transaction (a second approval); with other positions open it stays in Phoenix as their collateral.
export async function solanaPerpsClose(opts: {
  market: string;
  side?: "long" | "short";
  sizeUsd?: number;
  slippageBps?: number;
  /** onLeg / cancel / stop (submit.ts BatchControl) of the close; `returnControl` of the USDC return (its own approval). */
  control?: BatchControl;
  returnControl?: BatchControl;
}): Promise<string> {
  const owner = requireActiveRealWallet("solana").full;
  const { key, spline } = await freshPerpsMarket(opts.market);
  const p = await loadPerps(owner);
  await grantPhoenixCapabilitiesOnFork(p.margin);
  const base = p.trader?.positions.find((x) => x.assetId === spline.assetId)?.baseLots ?? 0n;
  if (base === 0n) throw new Error(`No open ${key}-PERP position`);
  const isLong = base > 0n;
  const abs = isLong ? base : -base;
  const ref = ticksToUsd(spline, spline.markTicks);
  let lots = abs;
  if (opts.sizeUsd !== undefined) {
    lots = BigInt(Math.floor((opts.sizeUsd / ref) * 10 ** spline.lotDecimals));
    if (lots <= 0n) throw new Error(`Size too small for ${key}-PERP`);
    if (lots > abs) lots = abs;
  }
  // One attempt only (a second attempt would be a second approval): the limit is the wider of the requested slippage and
  // MAX_CLOSE_SLIPPAGE_BPS, so a close goes through; Phoenix still fills at the best available price.
  const bps = Math.max(opts.slippageBps ?? 100, MAX_CLOSE_SLIPPAGE_BPS);
  const limit = isLong ? ref * (1 - bps / 10_000) : ref * (1 + bps / 10_000);
  const widths = healthWidths(owner, p.assetMap);
  const variant = (level: number) => async () => {
    const only = await widths(level);
    if (!only) return null;
    return {
      parts: [{
        instructions: [await phoenixCall(
          p,
          marketOrderData({ side: isLong ? ASK : BID, priceInTicks: usdToTicks(spline, limit), lots, reduceOnly: true }),
          orderAccounts(p.ex, p.margin, spline),
          [spline.assetId],
          [],
          { onlyAssets: only([]) }
        )],
        label: `Close ${key}-PERP`,
        before: async (retry: boolean) => void (await refreshPerpsOnFork(key, retry)),
      }],
      omits: level > 0,
    };
  };
  const signature = await sendWalletParts(owner, PHOENIX_MAINNET_TABLES, [0, ...NARROW_LEVELS].map(variant), `Close ${key}-PERP`, opts.control);
  const now = (await loadPerps(owner)).trader?.positions.find((x) => x.assetId === spline.assetId)?.baseLots ?? 0n;
  if (now === base) throw new Error(`No liquidity near the mark for ${key}-PERP. Try again shortly (Tx: ${signature})`);
  return opts.sizeUsd === undefined ? returnUsdcAfterClose(owner, signature, opts.returnControl) : signature;
}

/**
 * Close all finished only in part: `closed` are the markets now flat, `stillOpen` the positions the chain still shows (read after
 * the send), so the sheet can offer to close exactly those.
 */
export class PerpsCloseIncompleteError extends Error {
  readonly closed: string[];
  readonly stillOpen: { market: string; side: "long" | "short" }[];
  constructor(closed: string[], stillOpen: { market: string; side: "long" | "short" }[], reason: string) {
    const open = stillOpen.map((s) => `${s.market}-PERP`).join(", ");
    super(closed.length ? `Closed ${closed.length} of ${closed.length + stillOpen.length}. Still open: ${open}. ${reason}` : `Still open: ${open}. ${reason}`);
    this.name = "PerpsCloseIncompleteError";
    this.closed = closed;
    this.stillOpen = stillOpen;
  }
}

/**
 * Closes several positions behind ONE wallet approval (Close all): each close is its own transaction, all signed in one
 * sign_transactions request. The closes do not depend on each other (reduce-only orders on different markets, each with its own
 * durable nonce), so every market is refreshed in one pass and all parts are checked, sent and confirmed together
 * (sendSolanaBatch `independent`). Afterwards the chain is read: positions still open throw a PerpsCloseIncompleteError that
 * names them. Returns the last signature.
 */
// `control`: onLeg / cancel / stop of the closes (one approval, all sent together: once approved nothing is held back, so Stop has
// nothing to stop); `returnControl`: the USDC return after the last close (its own approval, see returnUsdcAfterClose).
export async function solanaPerpsCloseMany(targets: { market: string; side?: "long" | "short" }[], control?: BatchControl, returnControl?: BatchControl): Promise<string> {
  if (targets.length === 1) return solanaPerpsClose({ market: targets[0].market, side: targets[0].side, control, returnControl });
  const owner = requireActiveRealWallet("solana").full;
  const keys = [...new Set(targets.map((t) => t.market.toUpperCase().replace(/-PERP$/, "")))];
  const { book, splines } = await refreshPerpsMarketsOnFork(keys);
  const markets = keys.map((key) => {
    const spline = splines.find((s) => s.symbol.toUpperCase() === key);
    if (!spline || !book.markets.some((m) => m.assetId === spline.assetId)) throw new Error(`${key}-PERP is not a listed Phoenix market`);
    return { key, spline };
  });
  const p = await loadPerps(owner);
  await grantPhoenixCapabilitiesOnFork(p.margin);
  const open = markets.map((m) => ({ ...m, base: p.trader?.positions.find((x) => x.assetId === m.spline.assetId)?.baseLots ?? 0n })).filter((m) => m.base !== 0n);
  if (!open.length) throw new Error("No open positions to close");
  const widths = healthWidths(owner, p.assetMap);
  const variant = (level: number) => async () => {
    const only = await widths(level);
    if (!only) return null;
    return {
      parts: await Promise.all(open.map(async ({ key, spline, base }) => {
        const isLong = base > 0n;
        const ref = ticksToUsd(spline, spline.markTicks);
        const limit = isLong ? ref * (1 - MAX_CLOSE_SLIPPAGE_BPS / 10_000) : ref * (1 + MAX_CLOSE_SLIPPAGE_BPS / 10_000);
        return {
          instructions: [await phoenixCall(
            p,
            marketOrderData({ side: isLong ? ASK : BID, priceInTicks: usdToTicks(spline, limit), lots: isLong ? base : -base, reduceOnly: true }),
            orderAccounts(p.ex, p.margin, spline),
            [spline.assetId],
            [],
            { onlyAssets: only([]) }
          )],
          label: `Close ${key}-PERP`,
          before: async (retry: boolean) => void (await refreshPerpsOnFork(key, retry)),
        };
      })),
      omits: level > 0,
      independent: true,
      refreshAll,
    };
  };
  const refreshAll = async (retry: boolean) => void (await refreshPerpsMarketsOnFork(open.map((m) => m.key), retry));
  let signature: string | undefined;
  let failure: unknown;
  try {
    signature = await sendWalletParts(owner, PHOENIX_MAINNET_TABLES, [0, ...NARROW_LEVELS].map(variant), "Close all positions", control);
  } catch (e) {
    failure = e;
  }
  // What the chain shows now decides the result, whatever the send reported (a part whose confirmation timed out may have landed).
  let after: PhoenixTraderState["positions"];
  try {
    after = (await loadPerps(owner)).trader?.positions ?? [];
  } catch (e) {
    throw failure ?? e;
  }
  const now = (m: (typeof open)[number]) => after.find((x) => x.assetId === m.spline.assetId)?.baseLots ?? 0n;
  const stillOpen = open.filter((m) => now(m) !== 0n);
  const last = signature ?? (failure instanceof BatchPartError ? failure.landed[failure.landed.length - 1] : undefined);
  if (stillOpen.length) {
    const closed = open.filter((m) => now(m) === 0n).map((m) => m.key);
    // Nothing changed on chain (the wallet said no, a check before sending failed): the original error says why.
    if (failure && !closed.length && stillOpen.every((m) => now(m) === m.base)) throw failure;
    const reason = failure ? (failure instanceof Error ? failure.message : String(failure)) : "No liquidity near the mark. Try again shortly.";
    throw new PerpsCloseIncompleteError(closed, stillOpen.map((m) => ({ market: m.key, side: now(m) > 0n ? "long" : "short" })), last ? `${reason} (Tx: ${last})` : reason);
  }
  return returnUsdcAfterClose(owner, last ?? "", returnControl);
}

// Ported from apps/solana/lib/solana/perps.ts:withdrawPerpCollateral
export async function solanaPerpsWithdraw(amountUi?: number | string, all?: boolean, control?: BatchControl): Promise<string> {
  const owner = requireActiveRealWallet("solana").full;
  const assetMap = await readAllAssetConfigs();
  await ensureFreshForkPrices(TOKENS, assetMap);
  const p = await loadPerps(owner);
  await grantPhoenixCapabilitiesOnFork(p.margin);
  const collateral = p.trader?.collateral ?? 0n;
  if (collateral <= 0n) {
    // An earlier withdraw left phUSD in the margin account (its unwrap did not land): unwrap it now.
    const ph = BigInt((await rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [marginVault(p.margin, p.ex.canonicalMint, TOKEN_PROGRAM_ID)]).catch(() => null))?.value?.amount ?? "0");
    if (ph > 0n) return sendWalletParts(owner, PHOENIX_MAINNET_TABLES, perpsWithdrawVariants(p, 0n, false), "Withdraw from Phoenix", control);
    throw new Error("No USDC in Phoenix to withdraw");
  }
  const requested = all || amountUi === undefined ? collateral : toRaw(amountUi, 6);
  const amount = requested > collateral ? collateral : requested;
  if (amount <= 0n) throw new Error("Enter an amount greater than zero");
  try {
    return await sendWalletParts(owner, PHOENIX_MAINNET_TABLES, perpsWithdrawVariants(p, amount, amount === collateral && p.openAssetIds.length === 0), "Withdraw from Phoenix", control);
  } catch (e) {
    if (e instanceof BatchPartError) throw new Error(`The USDC left Phoenix and is in your margin account as phUSD, but turning it back into USDC failed: ${e.message}. Tap Withdraw again to finish.`);
    throw e;
  }
}

/** Turns the phUSD in the margin account (left by a perps open whose order did not land) back into USDC: one approval. */
export async function solanaPerpsUnwrap(): Promise<string> {
  const owner = requireActiveRealWallet("solana").full;
  await ensureFreshForkPrices(TOKENS, await readAllAssetConfigs());
  const p = await loadPerps(owner);
  const ph = BigInt((await rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [marginVault(p.margin, p.ex.canonicalMint, TOKEN_PROGRAM_ID)]).catch(() => null))?.value?.amount ?? "0");
  if (ph <= 0n) throw new Error("No phUSD in your margin account to turn back into USDC");
  return sendWalletParts(owner, PHOENIX_MAINNET_TABLES, perpsWithdrawVariants(p, 0n, false), "Turn phUSD back into USDC");
}
