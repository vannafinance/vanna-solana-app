import type { AmountProblem } from "@/types/earn";

// `poolLimit` is set for a withdrawal: the pool can only pay out what it has not lent.
export function checkAmount(amount: bigint | null, limit: bigint, poolLimit?: bigint): AmountProblem | null {
  if (amount === null || amount === 0n) return "empty";
  if (amount > limit) return "insufficient";
  if (poolLimit !== undefined && amount > poolLimit) return "pool-liquidity";
  return null;
}
