import { useState } from "react";

import { useSupply } from "./use-supply";
import { useWithdraw } from "./use-withdraw";

export type EarnFormMode = "supply" | "withdraw";

export function useEarnForm(id: string, initialMode: EarnFormMode) {
  const [mode, setMode] = useState(initialMode);
  const supply = useSupply(id);
  const withdraw = useWithdraw(id);

  return { mode, setMode, ...(mode === "supply" ? supply : withdraw) };
}
