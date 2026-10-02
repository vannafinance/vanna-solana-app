export type AssetSymbol = "SOL" | "USDC" | "TSLAx" | "GOOGLx" | "AAPLx" | "ANTHROPIC" | "OPENAI";

export type AssetInfo = {
  symbol: AssetSymbol;
  mint: string;
  decimals: number;
  pythFeedId: string;
  token2022: boolean;
};

export const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";

export const assets: readonly AssetInfo[] = [
  { symbol: "SOL", mint: NATIVE_SOL_MINT, decimals: 9, pythFeedId: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", token2022: false },
  { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, pythFeedId: "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a", token2022: false },
  { symbol: "TSLAx", mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB", decimals: 8, pythFeedId: "e6da44bff5b8b06897a3739dd331b440d6662595bb862e37046892c568ae3fc0", token2022: true },
  { symbol: "GOOGLx", mint: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN", decimals: 8, pythFeedId: "ad519718d387de4f0d7d29ea16a3730ce42e49c59fef6fba6fc9bac477645f6f", token2022: true },
  { symbol: "AAPLx", mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp", decimals: 8, pythFeedId: "aaba35e6f33fb973bb2201d48a79ae24795affa6ba8bd50a93dcaf7da0030f36", token2022: true },
  { symbol: "ANTHROPIC", mint: "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw", decimals: 9, pythFeedId: "e2b7d8199aa16dfcefcb89b6614e0a95c08bc283745412d209d0b3ca099b0721", token2022: true },
  { symbol: "OPENAI", mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF", decimals: 9, pythFeedId: "1847efd0848d500cd781f05957ca787d64e80cfc7cefd734337fc9858626e634", token2022: true },
];

export const assetByMint = new Map(assets.map((asset) => [asset.mint, asset]));
