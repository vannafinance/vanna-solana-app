// Solana token metadata, program IDs, and vault registries without @solana/web3.js.
// # Ported from: apps/solana/lib/solana/tokens.ts, kamino.ts, perena.ts, vault-catalogue.ts

import { MINT_SYMBOL, RESERVES as BASE_RESERVES, VANNA_PROGRAM_ID } from "./config";

export { MINT_SYMBOL, VANNA_PROGRAM_ID };

export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

export const PHOENIX_PROGRAM_ID = "EtrnLzgbS7nMMy5fbD42kXiUzGg8XQzJ972Xtk1cjWih";
export const PHOENIX_EXCHANGE = "2zskx2iyCvb6Stg7RBZkt1f6MrF4dpYtMG3yMvKwqtUZ";
export const PHUSD_MINT = "PhUsd11YkbjSaWjFncfAAmatntsjx3MgDR9B6g1ks3A";

export const RESERVES = BASE_RESERVES;

export interface KaminoReceiptMeta {
  symbol: string;
  underlying: string;
  reserve: string;
  collateralMint: string;
  decimals: number;
}

// # Ported from: apps/solana/lib/solana/kamino.ts:KAMINO_RECEIPTS
export const KAMINO_RECEIPTS: KaminoReceiptMeta[] = [
  {
    symbol: "kSOL",
    underlying: "SOL",
    reserve: "d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q",
    collateralMint: "2UywZrUdyqs5vDchy7fKQJKau2RVyuzBev2XKGPDSiX1",
    decimals: 6,
  },
  {
    symbol: "kUSDC",
    underlying: "USDC",
    reserve: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
    collateralMint: "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",
    decimals: 6,
  },
  {
    symbol: "kUSDT",
    underlying: "USDT",
    reserve: "H3t6qZ1JkguCNTi9uzVKqQ7dvt2cum4XiXWom6Gn5e5S",
    collateralMint: "B8zf4kojJbwgCRKA7rLaLhRCZBGhgAJp8wPBVZZHMhSv",
    decimals: 6,
  },
];

export interface PerenaVaultMeta {
  id: string;
  name: string;
  mint: string;
  account: string;
  priceOffset: number;
  decimals: number;
  icon: string;
}

// # Ported from: apps/solana/lib/solana/perena.ts:PERENA_SHARES
export const PERENA_VAULTS: PerenaVaultMeta[] = [
  {
    id: "usdstar",
    name: "USD*",
    mint: "star9agSpjiFe3M49B3RniVU4CMBBEK3Qnaqn3RGiFM",
    account: "ECJGrTZ6QYMEwiEAnL4oReWF126uc22e9Lojy9qyCjHT",
    priceOffset: 1584,
    decimals: 6,
    icon: "USDSTAR",
  },
  {
    id: "junior",
    name: "USD* Junior",
    mint: "3AJYCjrhKitmBd8tRUurPA5dGHCAQh6A8L9DkuSC37Rm",
    account: "FbsiAonbNrC3EKWMrZxx9iSc5Q7e7zSAkro4tD8dQQJS",
    priceOffset: 256,
    decimals: 6,
    icon: "USDSTARJ",
  },
];

export interface BasisVaultMeta {
  id: string;
  name: string;
  symbol: string;
  asset: string;
  mint: string;
  account: string;
  decimals: number;
}

// # Ported from: apps/solana/lib/solana/vault-catalogue.ts:VAULTS
export const BASIS_VAULTS: BasisVaultMeta[] = [
  {
    id: "basis-sol",
    name: "SOL Basis",
    symbol: "vbSOL",
    asset: "SOL",
    mint: "zMv5AVEURXUVBNmTqvV7ecgXun4uRAq8m3JM13iW71B",
    account: "BLeEcGjJnbGQyDBeTgckreKnKD87xFDDBFTfQYEyZ1j7",
    decimals: 6,
  },
  {
    id: "basis-eth",
    name: "ETH Basis",
    symbol: "vbETH",
    asset: "ETH",
    mint: "6Xin8G4Lq9RPxEDc1NnZ4JAkqwLstnosbnu3AeQavVuZ",
    account: "7PwzomohGgy1WQeDRaJQs31UQqhapJk67gCg4zoL7znv",
    decimals: 6,
  },
  {
    id: "basis-btc",
    name: "BTC Basis",
    symbol: "vbBTC",
    asset: "BTC",
    mint: "7LgRZNY3XTLx95LL1YYz4q7cFLAwupwtEjYepBPvSJ1R",
    account: "6qFcw8qCq2oxh1iqpYAKLw3Z7tUMj6APP4tNuHyosveZ",
    decimals: 6,
  },
  {
    id: "basis-tsla",
    name: "TSLA Basis",
    symbol: "vbTSLA",
    asset: "TSLA",
    mint: "AzYyMurfA6r5hhBT2R294Zx6pMdeZfCYJ48AkcEnc43T",
    account: "J23xTNSTgiWdVMgcDbQgJMRc5MWhQ4Q2TrcnbDwG8ejw",
    decimals: 6,
  },
  {
    id: "basis-meta",
    name: "META Basis",
    symbol: "vbMETA",
    asset: "META",
    mint: "3EfoqbFDf7FSgtifJsyFiG1QFFStf72tm2n8iqyBh5pa",
    account: "3P5p9a4pr6NqRtZpbpPMhC2Kgg5AFjCHishuxP6FW1pJ",
    decimals: 6,
  },
];

export const ALL_VAULT_MINTS: string[] = [
  ...PERENA_VAULTS.map((v) => v.mint),
  ...BASIS_VAULTS.map((v) => v.mint),
];

// # Ported from: apps/solana/lib/solana/phoenix.ts:PERP_MARKETS
export const PHOENIX_MARKETS: Record<number, { sym: string; lotDecimals: number; maxLev: number }> = {
  0: { sym: "SOL", lotDecimals: 2, maxLev: 5 },
  1: { sym: "BTC", lotDecimals: 4, maxLev: 5 },
  2: { sym: "ETH", lotDecimals: 3, maxLev: 5 },
  42: { sym: "TSLA", lotDecimals: 3, maxLev: 3 },
  49: { sym: "META", lotDecimals: 3, maxLev: 3 },
};

export const VAULT_CATALOGUE_APYS: Record<string, number> = {
  "kamino-sol": 4.13,
  "kamino-usdc": 4.43,
  "kamino-usdt": 4.13,
  usdstar: 9.46,
  junior: 14.18,
  "basis-sol": 10.63,
  "basis-eth": 8.63,
  "basis-btc": 7.19,
  "basis-tsla": 6.85,
  "basis-meta": 5.92,
};
