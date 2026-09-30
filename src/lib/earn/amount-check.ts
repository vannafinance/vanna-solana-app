import type { AmountProblem } from "@/types/earn";

export function checkAmount(amount: bigint | null, limit: bigint): AmountProblem | null {
  if (amount === null || amount === 0n) return "empty";
  if (amount > limit) return "insufficient";
  return null;
}
