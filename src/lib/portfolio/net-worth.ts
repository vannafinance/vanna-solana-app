import type { NetWorthPart } from "@/types/portfolio";

export type NetWorthParts = {
  // Null when that part cannot be read.
  wallet: bigint | null;
  earn: bigint | null;
  // The margin account's net value (collateral minus borrowed); zero without an account.
  margin: bigint;
};

// Net worth is the wallet, plus what is supplied to Earn, plus the margin account's net value. A part that cannot be read
// is left out and named, so a low total is never mistaken for the real one.
export function netWorth({ wallet, earn, margin }: NetWorthParts): { total: bigint; missing: NetWorthPart[] } {
  const missing: NetWorthPart[] = [];
  if (wallet === null) missing.push("wallet");
  if (earn === null) missing.push("earn");
  return { total: (wallet ?? 0n) + (earn ?? 0n) + margin, missing };
}
