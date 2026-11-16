import { createContext, type ReactNode, useContext } from "react";

// This build is Solana only. `Chain` stays a type (and `useChain` a hook) so the screens that read it keep working, but there is one value.
export type Chain = "solana";

export const CHAIN_LABEL: Record<Chain, string> = { solana: "Solana" };

const ChainContext = createContext<{ chain: Chain; setChain: (c: Chain) => void }>({ chain: "solana", setChain: () => {} });

export function ChainProvider({ children }: { children: ReactNode }) {
  return <ChainContext.Provider value={{ chain: "solana", setChain: () => {} }}>{children}</ChainContext.Provider>;
}

export function useChain() {
  return useContext(ChainContext);
}

