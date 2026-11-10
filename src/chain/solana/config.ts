// Solana: the Vanna mainnet fork the web app uses (Vanna_Finance_Backend apps/solana/lib/solana/config.ts).
export const SOLANA_RPC = "https://rpc-devnet.solana.vanna.finance";
export const VANNA_PROGRAM_ID = "H37YVBG3eGtz89ofd7iDLc2PJgn12778392XeU2QJcGC";

// The oracle agent's PriceBook (PDA "price_book" of FXY5DRfekMUTbUp4uyCFpCZmCccrp6kPq3hTM4GRihnc) and the Pyth receiver.
export const PRICE_BOOK = "EdSNPSVutkVEd1ie2vKNCuixd8ABB2ZxCyaqYC5WWpk2";
export const PYTH_RECEIVER = "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ";

// Registry tokens by mint (web apps/solana/lib/solana/tokens.ts), for naming prices.
export const MINT_SYMBOL: Record<string, string> = {
  So11111111111111111111111111111111111111112: "SOL",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: "JitoSOL",
  jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v: "JupSOL",
  JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD: "JupUSD",
  Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh: "NVDAx",
  XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN: "GOOGLx",
  XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp: "AAPLx",
  XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB: "TSLAx",
};

// Earn pools that are live on the fork: their Reserve account (a program PDA, fixed) and token decimals.
export const RESERVES: Record<string, { reserve: string; mint: string; decimals: number }> = {
  SOL: { reserve: "qKe68DeWMV8MHqDzMvK7W3b98eii63NkMg9CtePvEZK", mint: "So11111111111111111111111111111111111111112", decimals: 9 },
  USDC: { reserve: "A4x4ZZn134HAodwDdFdB9hquaqhwcxqbq5mVxnTXTY4t", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
  USDT: { reserve: "EkSogUZ3gLwFD7oeefFLjXwrnbhu3bcWuVxYxshXuk2X", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
};
