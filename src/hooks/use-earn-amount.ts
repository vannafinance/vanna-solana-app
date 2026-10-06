import { useState } from "react";

import { parseUnits } from "@/format/format-amount";
import { checkAmount } from "@/lib/earn/amount-check";
import { sanitizeAmountInput, toInputText } from "@/lib/earn/amount-input";
import { fractionOf } from "@/lib/earn/share-math";

const QUICK_FILLS = [
  { label: "25%", fraction: 0.25 },
  { label: "50%", fraction: 0.5 },
  { label: "Max", fraction: 1 },
] as const;

export function useEarnAmount(decimals: number, limit: bigint, poolLimit?: bigint) {
  const [text, setText] = useState("");
  const parsed = parseUnits(text, decimals);

  return {
    text,
    amount: parsed ?? 0n,
    problem: checkAmount(parsed, limit, poolLimit),
    fills: QUICK_FILLS.map((fill) => ({ ...fill, selected: parsed !== null && parsed > 0n && parsed === fractionOf(limit, fill.fraction) })),
    onChangeText: (next: string) => {
      const sanitized = sanitizeAmountInput(next, decimals);
      if (sanitized !== null) setText(sanitized);
    },
    fill: (fraction: number) => setText(toInputText(fractionOf(limit, fraction), decimals)),
    clear: () => setText(""),
  };
}
