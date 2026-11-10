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
import { fetchSolanaPools } from "./pools";
import { rpc } from "./rpc";
import {
  COMPUTE_BUDGET_PROGRAM_ID,
  type AccountMeta,
  type RawInstruction,
  sendSolanaInstructions,
} from "./submit";
import { findAta } from "./derive";
import { ALL_VAULT_MINTS } from "./tokens";

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
    depositable: false,
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
    assetIndex,
    decimals,
    collateralEnabled,
    borrowEnabled,
    priceSource: oracle.klendReserve !== SYSTEM_PROGRAM_ID ? "kaminoReceipt" : "oracle",
    priceSourceAccount: oracle.klendReserve,
  };
}

// Ported from apps/solana/lib/solana/protocol-state.ts:readAllAssetConfigs
export async function readAllAssetConfigs(): Promise<Map<number, AssetConfigState>> {
  const mints: string[] = [
    ...TOKENS.map((t) => t.mint),
    ...Object.values(KAMINO_RECEIPTS).map((r) => r.collateralMint),
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

// Ported from apps/solana/lib/solana/margin.ts:buildHealthRemainingAccounts
export async function buildHealthRemainingAccounts(
  margin: string,
  exclude: { collateral?: number[]; debt?: number } = {},
  pricedMints: string[] = [],
  opts: { extraAssetIds?: number[]; venueScan?: boolean } = {}
): Promise<AccountMeta[]> {
  const protocolPda = protocolConfigPda();
  const [protocolInfo, marginInfo, assetMap] = await Promise.all([
    rpc<{ value: { data: [string, string] } }>("getAccountInfo", [protocolPda, { encoding: "base64" }]),
    rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [margin, { encoding: "base64" }]),
    readAllAssetConfigs(),
  ]);

  if (!protocolInfo?.value) throw new Error("ProtocolConfig missing");
  const pBuf = Buffer.from(protocolInfo.value.data[0], "base64");
  const allowed: number[] = [];
  for (let i = 0; i < 24; i++) {
    const idx = pBuf.readUInt16LE(109 + 2 * i);
    if (idx !== EMPTY_ASSET_INDEX) allowed.push(idx);
  }

  const marginCollateral: number[] = [];
  const debts: number[] = [];
  if (marginInfo?.value) {
    const mBuf = Buffer.from(marginInfo.value.data[0], "base64");
    for (let i = 0; i < 24; i++) {
      const v = mBuf.readUInt16LE(43 + 2 * i);
      if (v !== EMPTY_ASSET_INDEX) marginCollateral.push(v);
      const d = mBuf.readUInt16LE(91 + 2 * i);
      if (d !== EMPTY_ASSET_INDEX) debts.push(d);
    }
  }

  const collateralSlots = [...allowed, ...marginCollateral];
  const debtSlots = debts;

  const metas: AccountMeta[] = [];
  const oracles: string[] = [];
  let holdsVenue = false;

  // 1. Collateral groups
  const skipCol = new Set(exclude.collateral ?? []);
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

    oracles.push(...asset.oracleAccounts);
    if (skipCol.has(idx)) continue;
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
    const phoenixAccs = await fetchPhoenixOracleAccounts(margin, opts.extraAssetIds ?? []);
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

  return metas;
}

// ---------------------------------------------------------------------------------------------
// A) Earn: Supply & Withdraw
// ---------------------------------------------------------------------------------------------

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\lend.ts:supply
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

  const minShares = 1n; // Minimum shares slippage floor

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

  let sharesToRedeem = heldShares;
  if (!all && amountUi !== undefined) {
    const wantedAssets = toRaw(amountUi, token.decimals);
    // Approximate shares: 1 share ~= 1 asset (slippage bounded)
    sharesToRedeem = wantedAssets;
    if (sharesToRedeem > heldShares) sharesToRedeem = heldShares;
  }

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

  const minAssets = 1n; // Slippage bound floor

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
  remainingAccounts: AccountMeta[]
): RawInstruction {
  const margin = marginPda(owner);
  const reserve = reservePda(token.mint);
  const data = Buffer.alloc(8 + 8 + 16);
  anchorDiscriminator("user_borrow").copy(data, 0);
  data.writeBigUInt64LE(amount, 8);
  data.writeBigUInt64LE(maxDebtShares & 0xffffffffffffffffn, 16);
  data.writeBigUInt64LE(maxDebtShares >> 64n, 24);

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

  const instructions: RawInstruction[] = [];
  const suffix: RawInstruction[] = [];

  // Check if margin account exists
  const marginAccountInfo = await rpc<{ value: unknown }>("getAccountInfo", [margin, { encoding: "base64" }]);
  if (!marginAccountInfo?.value) {
    if (params.createIfMissing !== false) {
      instructions.push(createMarginIx(owner));
    } else {
      throw new Error("Margin account does not exist. Create margin account first.");
    }
  }

  // Handle Deposits
  for (const dep of params.deposits ?? []) {
    const token = getToken(dep.sym);
    const amountRaw = toRaw(dep.amount, token.decimals);
    if (amountRaw <= 0n) continue;

    let source = tokenAta(owner, token.mint, token.tokenProgram);
    if (token.isNative) {
      const wrap = await wrapSol(owner, amountRaw);
      instructions.push(...wrap.instructions);
      source = wrap.ata;
      if (!wrap.existed) {
        suffix.push(splTokenCloseAccountIx(wrap.ata, owner, owner, TOKEN_PROGRAM_ID));
      }
    }
    instructions.push(depositCollateralIx(owner, token, amountRaw, source));
  }

  // Handle Borrows
  for (const bor of params.borrows ?? []) {
    const token = getToken(bor.sym);
    const amountRaw = toRaw(bor.amount, token.decimals);
    if (amountRaw <= 0n) continue;

    // max debt shares bound (1.05x buffer)
    const maxDebtShares = (amountRaw * 105n) / 100n;
    const assetMap = await readAllAssetConfigs();
    const asset = [...assetMap.values()].find((a) => a.mint === token.mint);
    const remaining = await buildHealthRemainingAccounts(
      margin,
      asset ? { collateral: [asset.assetIndex], debt: asset.assetIndex } : {},
      [token.mint]
    );
    instructions.push(borrowIx(owner, token, amountRaw, maxDebtShares, remaining));
  }

  return sendSolanaInstructions([...instructions, ...suffix], {
    label: "Deposit and Borrow",
    computeUnits: EXEC_COMPUTE_UNITS,
  });
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
      { pubkey: marginVault(margin, token.mint, token.tokenProgram), isSigner: false, isWritable: true },
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

  const repayAll = Boolean(params.all);
  const rawAmount = params.amount !== undefined ? toRaw(params.amount, token.decimals) : 0n;

  if (params.source === "wallet" && rawAmount > 0n) {
    let walletSource = tokenAta(owner, token.mint, token.tokenProgram);
    if (token.isNative) {
      const wrap = await wrapSol(owner, rawAmount);
      instructions.push(...wrap.instructions);
      walletSource = wrap.ata;
      if (!wrap.existed) suffix.push(splTokenCloseAccountIx(wrap.ata, owner, owner, TOKEN_PROGRAM_ID));
    }
    instructions.push(depositCollateralIx(owner, token, rawAmount, walletSource));
  }

  // Bound: max assets to pull from vault
  const maxAssets = repayAll ? (1n << 64n) - 1n : rawAmount;
  instructions.push(repayFromMarginIx(owner, token, maxAssets, repayAll));

  if (repayAll) {
    instructions.push(reclaimRentIx(owner, token));
  }

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
  remainingAccounts: AccountMeta[] = []
): RawInstruction {
  const margin = marginPda(owner);
  const data = Buffer.alloc(8 + 8 + 16);
  anchorDiscriminator("user_withdraw_collateral").copy(data, 0);
  data.writeBigUInt64LE(amount, 8);
  data.writeBigUInt64LE(minHealthFactorWad & 0xffffffffffffffffn, 16);
  data.writeBigUInt64LE(minHealthFactorWad >> 64n, 24);

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
  const remaining = await buildHealthRemainingAccounts(
    margin,
    asset ? { collateral: [asset.assetIndex] } : { collateral: [] },
    [token.mint]
  );

  const ix = withdrawCollateralIx(owner, token, amount, minHfWad, destination, remaining);

  return sendSolanaInstructions([...prefix, ix, ...suffix], {
    label: `Withdraw ${token.symbol} Collateral`,
    computeUnits: EXEC_COMPUTE_UNITS,
  });
}

// ---------------------------------------------------------------------------------------------
// C) margin_execute Wrapper for External Programs
// ---------------------------------------------------------------------------------------------

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\exec.ts:marginExecuteIx
export async function marginExecuteIx(
  owner: string,
  targetProgram: string,
  cpiData: Buffer,
  cpiAccounts: AccountMeta[],
  venueAsset: string | null = null,
  validatorAccounts: AccountMeta[] = [],
  pricedMints: string[] = [],
  healthOpts: { extraAssetIds?: number[]; venueScan?: boolean } = {}
): Promise<RawInstruction> {
  const margin = marginPda(owner);
  const remaining = await buildHealthRemainingAccounts(margin, {}, pricedMints, {
    ...healthOpts,
    venueScan: healthOpts.venueScan ?? Boolean(venueAsset),
  });

  // Discriminator: sha256("global:margin_execute")[0..8]
  // Args: data (Vec<u8>: u32 LE len + bytes), call_account_count (u16 LE)
  const disc = anchorDiscriminator("margin_execute");
  const dataLen = cpiData.length;
  const data = Buffer.alloc(8 + 4 + dataLen + 2);
  let o = 0;
  disc.copy(data, o); o += 8;
  data.writeUInt32LE(dataLen, o); o += 4;
  cpiData.copy(data, o); o += dataLen;
  data.writeUInt16LE(cpiAccounts.length, o);

  const eventAuthority = findPda(["__event_authority"], VANNA_PROGRAM_ID);
  const validatorSegment: AccountMeta[] = validatorAccounts.length > 0
    ? [{ pubkey: VALIDATOR_PROGRAM_ID, isSigner: false, isWritable: false }, ...validatorAccounts]
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
      { pubkey: venueAsset ?? SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
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

  const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${fromToken.mint}&outputMint=${toToken.mint}&amount=${rawIn}&slippageBps=${slippage}`;
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

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\exec.ts:executeMarginSwap
export async function solanaMarginSwap(params: {
  fromSym: string;
  toSym: string;
  amount: number | string;
  slippageBps?: number;
}): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const margin = marginPda(owner);
  const fromToken = getToken(params.fromSym);
  const toToken = getToken(params.toSym);
  const rawIn = toRaw(params.amount, fromToken.decimals);
  const slippage = params.slippageBps ?? 50;

  const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${fromToken.mint}&outputMint=${toToken.mint}&amount=${rawIn}&slippageBps=${slippage}`;
  const quoteRes = await fetch(quoteUrl);
  if (!quoteRes.ok) throw new Error(`Jupiter quote failed: ${quoteRes.statusText}`);
  const quoteData = await quoteRes.json();

  const swapRes = await fetch("https://lite-api.jup.ag/swap/v1/swap-instructions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quoteData,
      userPublicKey: margin,
      wrapAndUnwrapSol: false,
      useSharedAccounts: true,
    }),
  });
  if (!swapRes.ok) throw new Error(`Jupiter swap instructions failed: ${swapRes.statusText}`);
  const swapData = await swapRes.json();
  const swapIx = swapData.swapInstruction;
  if (!swapIx) throw new Error("Jupiter returned no swap instruction");

  // Ensure receiving margin vault ATA is created
  const receivedVault = marginVault(margin, toToken.mint, toToken.tokenProgram);
  const createAta = createAssociatedTokenAccountIdempotentIx(owner, receivedVault, margin, toToken.mint, toToken.tokenProgram);

  const cpiAccounts: AccountMeta[] = swapIx.accounts.map((a: { pubkey: string; isWritable: boolean }) => ({
    pubkey: a.pubkey,
    isSigner: false,
    isWritable: a.isWritable,
  }));

  const execIx = await marginExecuteIx(owner, JUPITER_V6_PROGRAM_ID, Buffer.from(swapIx.data, "base64"), cpiAccounts);

  return sendSolanaInstructions([createAta, execIx], {
    label: `Margin Swap ${fromToken.symbol} → ${toToken.symbol}`,
    computeUnits: EXEC_COMPUTE_UNITS,
    lookupTableAddresses: swapData.addressLookupTableAddresses ?? [],
  });
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

  const instructions: RawInstruction[] = [];
  const suffix: RawInstruction[] = [];

  // 1. Wallet deposit if requested
  if (walletRaw > 0n) {
    let source = tokenAta(owner, token.mint, token.tokenProgram);
    if (token.isNative) {
      const wrap = await wrapSol(owner, walletRaw);
      instructions.push(...wrap.instructions);
      source = wrap.ata;
      if (!wrap.existed) suffix.push(splTokenCloseAccountIx(wrap.ata, owner, owner, TOKEN_PROGRAM_ID));
    }
    instructions.push(depositCollateralIx(owner, token, walletRaw, source));
  }

  // 2. Borrow for leverage if requested
  if (borrowRaw > 0n) {
    const maxDebtShares = (borrowRaw * 105n) / 100n;
    const remaining = await buildHealthRemainingAccounts(margin, {}, [token.mint]);
    instructions.push(borrowIx(owner, token, borrowRaw, maxDebtShares, remaining));
  }

  // 3. Ensure receipt token ATA exists on margin
  const receiptVault = marginVault(margin, r.collateralMint, TOKEN_PROGRAM_ID);
  instructions.push(createAssociatedTokenAccountIdempotentIx(owner, receiptVault, margin, r.collateralMint, TOKEN_PROGRAM_ID));

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

  const execIx = await marginExecuteIx(owner, KLEND_PROGRAM_ID, cpiData, cpiAccounts);
  instructions.push(execIx);

  return sendSolanaInstructions([...instructions, ...suffix], {
    label: `Farm ${token.symbol} on Kamino`,
    computeUnits: EXEC_COMPUTE_UNITS,
  });
}

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\exec.ts:farmWithdraw
export async function solanaFarmWithdraw(params: {
  sym: string;
  receipts?: number | string;
  all?: boolean;
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

  const amount = params.all ? held : toRaw(params.receipts ?? 0, 6);
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

  const execIx = await marginExecuteIx(owner, KLEND_PROGRAM_ID, cpiData, cpiAccounts);

  return sendSolanaInstructions([execIx], {
    label: `Exit ${token.symbol} on Kamino`,
    computeUnits: EXEC_COMPUTE_UNITS,
  });
}

// ---------------------------------------------------------------------------------------------
// F) Perps: Phoenix Perpetual Orders & Margin Management (Implemented in perps-ix.ts)
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// G) Flash Repay: Complete Position Exit & Loan Repayment Flow
// ---------------------------------------------------------------------------------------------

// Ported from C:\Users\akgam\Documents\Company Work\Vanna App\_ref\vanna-web-backend\apps\solana\lib\solana\flash-repay.ts:executeFlashRepay
export async function solanaFlashRepay(params: {
  slippageBps?: number;
  onProgress?: (msg: string) => void;
} = {}): Promise<string[]> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const margin = marginPda(owner);
  const signatures: string[] = [];

  // Step 1: Kamino Farm Exit
  params.onProgress?.("Redeeming Kamino receipts...");
  for (const [sym, r] of Object.entries(KAMINO_RECEIPTS)) {
    try {
      const receiptVault = marginVault(margin, r.collateralMint, TOKEN_PROGRAM_ID);
      const bal = await rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [receiptVault]);
      if (bal?.value && BigInt(bal.value.amount) > 0n) {
        const sig = await solanaFarmWithdraw({ sym, all: true });
        signatures.push(sig);
      }
    } catch {}
  }

  // Step 2: Repay Loans from Margin
  params.onProgress?.("Repaying outstanding loans...");
  for (const sym of ["USDC", "USDT", "SOL"]) {
    try {
      const sig = await solanaRepay({ sym, all: true, source: "margin" });
      signatures.push(sig);
    } catch {}
  }

  return signatures;
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
// J) Perena, Phoenix Perps, and Predict (Full Zero-Dependency Ports)
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
  const rawAmount = toRaw(amountUi, 6);

  if (rawAmount <= 0n) throw new Error("Amount must be greater than zero");

  // Ensure margin ATAs for USDC and share mint exist
  const marginUsdcAta = marginVault(margin, USDC_MINT, TOKEN_PROGRAM_ID);
  const marginShareAta = marginVault(margin, share.mint, TOKEN_PROGRAM_ID);

  const createUsdcAta = createAssociatedTokenAccountIdempotentIx(owner, marginUsdcAta, margin, USDC_MINT, TOKEN_PROGRAM_ID);
  const createShareAta = createAssociatedTokenAccountIdempotentIx(owner, marginShareAta, margin, share.mint, TOKEN_PROGRAM_ID);

  const cpiData = perenaCallData(share, call, rawAmount);
  const cpiAccounts = perenaCallAccounts(share, call, margin);

  const execIx = await marginExecuteIx(
    owner,
    PERENA_PROGRAM_ID,
    cpiData,
    cpiAccounts,
    null,
    [],
    [USDC_MINT, share.mint]
  );

  return sendSolanaInstructions([createUsdcAta, createShareAta, execIx], {
    label: `Perena ${call === "deposit" ? "Deposit" : "Withdraw"} ${shareKey === "usdstar" ? "USD*" : "USD* Junior"}`,
    computeUnits: EXEC_COMPUTE_UNITS,
  });
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
export async function readPhoenixExchange(): Promise<PhoenixExchangeState> {
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
      symbol: data.subarray(base, base + 16).toString("utf8").replace(/\0+$/, ""),
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
export async function fetchPerpAssetMap(perpAssetMapPda: string): Promise<PhoenixMarketState[]> {
  const info = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [
    perpAssetMapPda,
    { encoding: "base64" },
  ]);
  if (!info?.value) return [];
  return decodePerpAssetMap(Buffer.from(info.value.data[0], "base64"));
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
export async function ensurePhoenixTraderOnFork(owner: string, margin: string): Promise<string> {
  const trader = phoenixTraderPda(margin);
  const infoRes = await rpc<{ value: { data: [string, string]; lamports: number } | null }>("getAccountInfo", [
    trader,
    { encoding: "base64" },
  ]);
  if (!infoRes?.value) {
    const ix = registerTraderIx(owner, margin);
    await sendSolanaInstructions([ix], { label: "Register Phoenix Trader" });
  }

  const traderInfo = await rpc<{ value: { data: [string, string]; lamports: number } | null }>("getAccountInfo", [
    trader,
    { encoding: "base64" },
  ]);
  if (traderInfo?.value) {
    const data = Buffer.from(traderInfo.value.data[0], "base64");
    if (data.length >= TRADER_FLAGS_OFFSET + 4) {
      const flags = data.readUInt32LE(TRADER_FLAGS_OFFSET);
      if ((flags & FULL_TRADER_CAPABILITIES) !== FULL_TRADER_CAPABILITIES) {
        data.writeUInt32LE(flags | FULL_TRADER_CAPABILITIES, TRADER_FLAGS_OFFSET);
        await rpc("surfnet_setAccount", [
          trader,
          {
            lamports: traderInfo.value.lamports,
            data: data.toString("hex"),
            owner: PHOENIX_PROGRAM_ID,
            executable: false,
            rentEpoch: 0,
          },
        ]).catch(() => {});
      }
    }
  }

  return trader;
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
  const normKey = marketKey.toUpperCase().replace(/-PERP$/, "");
  const m = splines.find((s) => s.symbol.toUpperCase() === normKey);
  if (!m) return;
  await Promise.allSettled([
    rpc("surfnet_resetAccount", [m.orderbook]).catch(() => {}),
    rpc("surfnet_resetAccount", [m.spline]).catch(() => {}),
  ]);
}

// Ported from apps/solana/lib/solana/perps.ts:openPerp
export async function solanaPerpsOpen(opts: {
  market: string;
  side: "long" | "short";
  collateralUsdc: number | string;
  leverage: number;
  slippageBps?: number;
}): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const margin = marginPda(owner);
  const amount = toRaw(opts.collateralUsdc, 6);

  // 1. Ensure trader account exists and is granted capabilities
  await ensurePhoenixTraderOnFork(owner, margin);

  // 2. Read protocol and Phoenix state
  const [ex, bookInfo, assetMap] = await Promise.all([
    readPhoenixExchange(),
    rpc<{ value: { data: [string, string] } }>("getAccountInfo", [phoenixMarketBook(), { encoding: "base64" }]),
    readAllAssetConfigs(),
  ]);
  if (!bookInfo?.value) throw new Error("Phoenix market book missing");
  const book = decodeMarketBook(Buffer.from(bookInfo.value.data[0], "base64"));
  const splines = await fetchPerpAssetMap(ex.perpAssetMap);

  // 3. Re-clone book from upstream on fork to avoid stale maker orders
  await refreshPhoenixBookOnFork(opts.market, ex, splines);

  // 4. Ensure per-margin lookup table
  const lutAddress = await ensurePerpsLookupTableOnFork(owner, margin, assetMap, book, ex, splines);

  // 5. Find market
  const normKey = opts.market.toUpperCase().replace(/-PERP$/, "");
  const spline = splines.find((s) => s.symbol.toUpperCase() === normKey);
  if (!spline) throw new Error(`Market ${opts.market} not found in Phoenix`);
  const bookEntry = book.markets.find((m) => m.assetId === spline.assetId);
  if (!bookEntry) throw new Error(`Market ${opts.market} not listed in market book`);

  const markUsd = ticksToUsd(spline, spline.markTicks);
  const slip = (opts.slippageBps ?? 100) / 10_000;
  const isLong = opts.side === "long";
  const limitPrice = isLong ? markUsd * (1 + slip) : markUsd * (1 - slip);
  const priceInTicks = usdToTicks(spline, limitPrice);

  const collUsd = Number(amount) / 1e6;
  const sizeUsd = collUsd > 0 ? collUsd * opts.leverage : 100 * opts.leverage;
  const lots = BigInt(Math.max(1, Math.round((sizeUsd * 10 ** spline.lotDecimals) / limitPrice)));

  const ixs: RawInstruction[] = [];

  // Collateral flow: USDC -> phUSD via Ember -> deposit to Phoenix
  if (amount > 0n) {
    const phusdVault = marginVault(margin, ex.canonicalMint, TOKEN_PROGRAM_ID);
    ixs.push(createAssociatedTokenAccountIdempotentIx(owner, phusdVault, margin, ex.canonicalMint, TOKEN_PROGRAM_ID));

    const emberData = Buffer.alloc(8 + 8);
    Buffer.from(EMBER_DEPOSIT).copy(emberData, 0);
    emberData.writeBigUInt64LE(amount, 8);
    const emberIx = await marginExecuteIx(
      owner,
      EMBER_PROGRAM_ID,
      emberData,
      emberAccounts(ex, margin, USDC_MINT),
      null,
      [],
      [USDC_MINT, ex.canonicalMint]
    );
    ixs.push(emberIx);

    const depData = Buffer.alloc(8 + 8);
    Buffer.from(DEPOSIT_FUNDS).copy(depData, 0);
    depData.writeBigUInt64LE(amount, 8);
    const depIx = await marginExecuteIx(
      owner,
      PHOENIX_PROGRAM_ID,
      depData,
      depositAccounts(ex, margin),
      null,
      [],
      [ex.canonicalMint]
    );
    ixs.push(depIx);
  }

  // Market Order
  const orderData = marketOrderData({
    side: isLong ? BID : ASK,
    priceInTicks,
    lots,
    reduceOnly: false,
  });

  const venueAsset = assetConfigPda(PHOENIX_EXCHANGE);
  const valAccounts = phoenixValidatorAccounts(book, [spline.assetId]);
  const orderIx = await marginExecuteIx(
    owner,
    PHOENIX_PROGRAM_ID,
    orderData,
    orderAccounts(ex, margin, spline),
    venueAsset,
    valAccounts,
    [],
    { extraAssetIds: [spline.assetId], venueScan: true }
  );
  ixs.push(orderIx);

  return sendSolanaInstructions(ixs, {
    label: `Open ${opts.market} Perp ${opts.side}`,
    computeUnits: EXEC_COMPUTE_UNITS,
    lookupTableAddresses: [lutAddress],
  });
}

// Ported from apps/solana/lib/solana/perps.ts:closePerp
export async function solanaPerpsClose(opts: {
  market: string;
  side?: "long" | "short";
  sizeUsd?: number;
  slippageBps?: number;
}): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const margin = marginPda(owner);

  const [ex, bookInfo, assetMap, traderInfo] = await Promise.all([
    readPhoenixExchange(),
    rpc<{ value: { data: [string, string] } }>("getAccountInfo", [phoenixMarketBook(), { encoding: "base64" }]),
    readAllAssetConfigs(),
    rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [phoenixTraderPda(margin), { encoding: "base64" }]),
  ]);
  if (!bookInfo?.value) throw new Error("Phoenix market book missing");
  const book = decodeMarketBook(Buffer.from(bookInfo.value.data[0], "base64"));
  const splines = await fetchPerpAssetMap(ex.perpAssetMap);

  await refreshPhoenixBookOnFork(opts.market, ex, splines);
  const lutAddress = await ensurePerpsLookupTableOnFork(owner, margin, assetMap, book, ex, splines);

  const normKey = opts.market.toUpperCase().replace(/-PERP$/, "");
  const spline = splines.find((s) => s.symbol.toUpperCase() === normKey);
  if (!spline) throw new Error(`Market ${opts.market} not found in Phoenix`);

  let positionBaseLots = 0n;
  if (traderInfo?.value) {
    const trader = decodeTrader(Buffer.from(traderInfo.value.data[0], "base64"));
    const pos = trader.positions.find((p) => p.assetId === spline.assetId);
    if (pos) positionBaseLots = pos.baseLots;
  }

  const isLong = opts.side ? opts.side === "long" : positionBaseLots > 0n;
  const absLots = positionBaseLots >= 0n ? positionBaseLots : -positionBaseLots;
  const lots = absLots > 0n ? absLots : 100_000n;

  const markUsd = ticksToUsd(spline, spline.markTicks);
  const slip = (opts.slippageBps ?? 200) / 10_000;
  const closeSide = isLong ? ASK : BID;
  const limitPrice = isLong ? markUsd * (1 - slip) : markUsd * (1 + slip);
  const priceInTicks = usdToTicks(spline, limitPrice);

  const orderData = marketOrderData({
    side: closeSide,
    priceInTicks,
    lots,
    reduceOnly: true,
  });

  const venueAsset = assetConfigPda(PHOENIX_EXCHANGE);
  const valAccounts = phoenixValidatorAccounts(book, [spline.assetId]);
  const execIx = await marginExecuteIx(
    owner,
    PHOENIX_PROGRAM_ID,
    orderData,
    orderAccounts(ex, margin, spline),
    venueAsset,
    valAccounts,
    [],
    { extraAssetIds: [spline.assetId], venueScan: true }
  );

  return sendSolanaInstructions([execIx], {
    label: `Close ${opts.market} Perp`,
    computeUnits: EXEC_COMPUTE_UNITS,
    lookupTableAddresses: [lutAddress],
  });
}

// Ported from apps/solana/lib/solana/perps.ts:withdrawPerpCollateral
export async function solanaPerpsWithdraw(amountUi?: number | string, all?: boolean): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const margin = marginPda(owner);

  const [ex, bookInfo, assetMap, traderInfo] = await Promise.all([
    readPhoenixExchange(),
    rpc<{ value: { data: [string, string] } }>("getAccountInfo", [phoenixMarketBook(), { encoding: "base64" }]),
    readAllAssetConfigs(),
    rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [phoenixTraderPda(margin), { encoding: "base64" }]),
  ]);
  if (!bookInfo?.value) throw new Error("Phoenix market book missing");
  const book = decodeMarketBook(Buffer.from(bookInfo.value.data[0], "base64"));
  const splines = await fetchPerpAssetMap(ex.perpAssetMap);
  const lutAddress = await ensurePerpsLookupTableOnFork(owner, margin, assetMap, book, ex, splines);

  let availableCollateral = 0n;
  if (traderInfo?.value) {
    const trader = decodeTrader(Buffer.from(traderInfo.value.data[0], "base64"));
    availableCollateral = trader.collateral > 0n ? trader.collateral : 0n;
  }

  const rawAmount = all || amountUi === undefined ? availableCollateral : toRaw(amountUi, 6);
  if (rawAmount <= 0n) throw new Error("No collateral available to withdraw");

  // 1. Phoenix withdraw_funds
  const withdrawData = Buffer.alloc(8 + 8);
  Buffer.from(WITHDRAW_FUNDS).copy(withdrawData, 0);
  withdrawData.writeBigUInt64LE(rawAmount, 8);

  const phusdVault = marginVault(margin, ex.canonicalMint, TOKEN_PROGRAM_ID);
  const createAta = createAssociatedTokenAccountIdempotentIx(owner, phusdVault, margin, ex.canonicalMint, TOKEN_PROGRAM_ID);

  const venueAsset = assetConfigPda(PHOENIX_EXCHANGE);
  const valAccounts = phoenixValidatorAccounts(book, []);
  const withdrawIx = await marginExecuteIx(
    owner,
    PHOENIX_PROGRAM_ID,
    withdrawData,
    withdrawAccounts(ex, margin),
    venueAsset,
    valAccounts,
    [ex.canonicalMint],
    { venueScan: true }
  );

  // 2. Ember withdraw: phUSD -> USDC
  const emberData = Buffer.alloc(8 + 1 + 8);
  Buffer.from(EMBER_WITHDRAW).copy(emberData, 0);
  emberData.writeUInt8(all ? 0 : 1, 8);
  if (!all) emberData.writeBigUInt64LE(rawAmount, 9);

  const emberIx = await marginExecuteIx(
    owner,
    EMBER_PROGRAM_ID,
    emberData,
    emberAccounts(ex, margin, USDC_MINT),
    null,
    [],
    [ex.canonicalMint, USDC_MINT]
  );

  return sendSolanaInstructions([createAta, withdrawIx, emberIx], {
    label: "Withdraw Phoenix Collateral",
    computeUnits: EXEC_COMPUTE_UNITS,
    lookupTableAddresses: [lutAddress],
  });
}

// ---------------------------------------------------------------------------------------------
// Predict (World.xyz) Integration
// ---------------------------------------------------------------------------------------------

// Ported from apps/solana/lib/predict/constants.ts
export const WORLD_PROGRAM_ID = "prediCtPZCttYMvm2W3PtxmMxLmT1dtN7riU6Cxh6tM";
export const CASH_MINT = "CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH";
export const SPLIT_DISCRIMINATOR = [124, 189, 27, 43, 216, 40, 147, 66];
export const MERGE_DISCRIMINATOR = [148, 141, 236, 47, 174, 126, 69, 111];

// Ported from apps/solana/lib/predict/trade.server.ts:completeSetIx
export function completeSetIx(
  kind: "split" | "merge",
  user: string,
  market: string,
  yes: string,
  no: string,
  vault: string,
  amount: bigint
): RawInstruction {
  const w = (pubkey: string): AccountMeta => ({ pubkey, isSigner: false, isWritable: true });
  const data = Buffer.alloc(8 + 8);
  Buffer.from(kind === "split" ? SPLIT_DISCRIMINATOR : MERGE_DISCRIMINATOR).copy(data, 0);
  data.writeBigUInt64LE(amount, 8);

  const userCash = findAta(user, CASH_MINT, TOKEN_2022_PROGRAM_ID);
  const userYes = findAta(user, yes, TOKEN_2022_PROGRAM_ID);
  const userNo = findAta(user, no, TOKEN_2022_PROGRAM_ID);

  return {
    programId: WORLD_PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      w(market),
      w(CASH_MINT),
      w(yes),
      w(no),
      w(userCash),
      w(vault),
      w(userYes),
      w(userNo),
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  };
}

// Ported from apps/solana/lib/predict/catalog.server.ts:forkMarket
export async function readPredictMarket(marketId: string): Promise<{ yesMint: string; noMint: string; vault: string }> {
  const res = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [
    marketId,
    { encoding: "base64" },
  ]);
  if (!res?.value) throw new Error(`Market account ${marketId} not found on chain`);
  const data = Buffer.from(res.value.data[0], "base64");

  const isCashAt40 = data.length >= 72 && base58(data.subarray(40, 72)) === CASH_MINT;
  const yesOffset = isCashAt40 ? 72 : 40;
  const noOffset = isCashAt40 ? 104 : 72;
  const vaultOffset = isCashAt40 ? 136 : 104;

  const yesMint = base58(data.subarray(yesOffset, yesOffset + 32));
  const noMint = base58(data.subarray(noOffset, noOffset + 32));
  const vault = base58(data.subarray(vaultOffset, vaultOffset + 32));

  return { yesMint, noMint, vault };
}

// Ported from apps/solana/lib/predict/trade.server.ts:buildTrade
export async function solanaPredictTrade(opts: {
  marketId: string;
  outcome: "yes" | "no";
  side: "buy" | "sell";
  amount: number;
}): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const rawAmount = toRaw(opts.amount, 6);

  const { yesMint, noMint, vault } = await readPredictMarket(opts.marketId);

  const cashAta = findAta(owner, CASH_MINT, TOKEN_2022_PROGRAM_ID);
  if (opts.side === "buy") {
    let cashBalance = 0n;
    try {
      const balRes = await rpc<{ value: { amount: string } | null }>("getTokenAccountBalance", [cashAta]);
      cashBalance = BigInt(balRes?.value?.amount ?? "0");
    } catch {}
    if (cashBalance < rawAmount) {
      const topUpAmount = rawAmount > 10_000_000_000n ? rawAmount * 2n : 10_000_000_000n;
      await rpc("surfnet_setTokenAccount", [
        owner,
        CASH_MINT,
        { amount: Number(topUpAmount) },
        TOKEN_2022_PROGRAM_ID,
      ]).catch(() => {});
    }
  }

  const yesAta = findAta(owner, yesMint, TOKEN_2022_PROGRAM_ID);
  const noAta = findAta(owner, noMint, TOKEN_2022_PROGRAM_ID);

  const ixs: RawInstruction[] = [
    createAssociatedTokenAccountIdempotentIx(owner, cashAta, owner, CASH_MINT, TOKEN_2022_PROGRAM_ID),
    createAssociatedTokenAccountIdempotentIx(owner, yesAta, owner, yesMint, TOKEN_2022_PROGRAM_ID),
    createAssociatedTokenAccountIdempotentIx(owner, noAta, owner, noMint, TOKEN_2022_PROGRAM_ID),
  ];

  const actionKind = opts.side === "buy" ? "split" : "merge";
  ixs.push(completeSetIx(actionKind, owner, opts.marketId, yesMint, noMint, vault, rawAmount));

  return sendSolanaInstructions(ixs, {
    label: `Predict ${opts.side === "buy" ? "Buy" : "Sell"} ${opts.outcome.toUpperCase()}`,
    computeUnits: 400_000,
  });
}

// Ported from apps/solana/lib/predict/trade.server.ts:buildTrade
export async function solanaPredictClaim(opts: {
  marketId: string;
  amount: number;
}): Promise<string> {
  const wallet = requireActiveRealWallet("solana");
  const owner = wallet.full;
  const rawAmount = toRaw(opts.amount, 6);

  const { yesMint, noMint, vault } = await readPredictMarket(opts.marketId);

  const cashAta = findAta(owner, CASH_MINT, TOKEN_2022_PROGRAM_ID);
  const yesAta = findAta(owner, yesMint, TOKEN_2022_PROGRAM_ID);
  const noAta = findAta(owner, noMint, TOKEN_2022_PROGRAM_ID);

  const ixs: RawInstruction[] = [
    createAssociatedTokenAccountIdempotentIx(owner, cashAta, owner, CASH_MINT, TOKEN_2022_PROGRAM_ID),
    createAssociatedTokenAccountIdempotentIx(owner, yesAta, owner, yesMint, TOKEN_2022_PROGRAM_ID),
    createAssociatedTokenAccountIdempotentIx(owner, noAta, owner, noMint, TOKEN_2022_PROGRAM_ID),
    completeSetIx("merge", owner, opts.marketId, yesMint, noMint, vault, rawAmount),
  ];

  return sendSolanaInstructions(ixs, {
    label: "Predict Claim / Merge Outcomes",
    computeUnits: 400_000,
  });
}

