import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

// One account, two chains. Per the design: Predict and Perps exist on Solana only.
export type Chain = "solana" | "stellar";

export const CHAIN_LABEL: Record<Chain, string> = { solana: "Solana", stellar: "Stellar" };

const SOLANA_ONLY = new Set(["predict", "perps"]);

export function sectionOn(section: string, chain: Chain) {
  return chain === "solana" || !SOLANA_ONLY.has(section);
}

const STORAGE_KEY = "vanna-chain";

const ChainContext = createContext<{ chain: Chain; setChain: (c: Chain) => void } | null>(null);

export function ChainProvider({ children }: { children: ReactNode }) {
  const [chain, setChainState] = useState<Chain>("solana");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => (v === "solana" || v === "stellar") && setChainState(v))
      .catch(() => {});
  }, []);

  const setChain = (c: Chain) => {
    setChainState(c);
    AsyncStorage.setItem(STORAGE_KEY, c).catch(() => {});
  };

  return <ChainContext.Provider value={{ chain, setChain }}>{children}</ChainContext.Provider>;
}

export function useChain() {
  const ctx = useContext(ChainContext);
  if (!ctx) throw new Error("useChain outside ChainProvider");
  return ctx;
}
