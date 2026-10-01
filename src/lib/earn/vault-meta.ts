import type { AssetSymbol } from "@/lib/solana/assets";
import type { VaultCategory } from "@/types/earn";

export const vaultMeta: Record<AssetSymbol, { name: string; category: VaultCategory }> = {
  SOL: { name: "Solana", category: "Crypto" },
  USDC: { name: "USD Coin", category: "Stablecoins" },
  TSLAx: { name: "Tesla xStock", category: "xStocks" },
  GOOGLx: { name: "Alphabet xStock", category: "xStocks" },
  AAPLx: { name: "Apple xStock", category: "xStocks" },
  ANTHROPIC: { name: "Anthropic PreStock", category: "PreStocks" },
  OPENAI: { name: "OpenAI PreStock", category: "PreStocks" },
};

export const vaultCategories: readonly VaultCategory[] = ["xStocks", "PreStocks", "Crypto", "Stablecoins"];

export const vaultId = (symbol: AssetSymbol) => symbol.toLowerCase();
