import { useSegments } from "expo-router";
import { createContext, type ReactNode, useContext } from "react";

import type { Space } from "@/theme/tokens";

const SpaceContext = createContext<Space>("portfolio");

const byFirstSegment: Record<string, Space> = { earn: "earn", trade: "trade", margin: "trade", farm: "farm" };

export function SpaceScope({ children }: { children: ReactNode }) {
  const [first = ""] = useSegments();
  return <SpaceContext.Provider value={byFirstSegment[first] ?? "portfolio"}>{children}</SpaceContext.Provider>;
}

export function useSpace() {
  return useContext(SpaceContext);
}
