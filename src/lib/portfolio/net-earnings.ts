import type { AssetSymbol } from "@/lib/solana/assets";
import { type EarnEvent, succeededEarnEvents } from "@/lib/solana/earn-history";

import type { ValuedDeposit } from "./value-deposits";

// Net principal per asset (supplied minus withdrawn). An asset whose history has a withdrawal of unknown
// size is left out: its principal cannot be stated, so its earnings cannot either. Failed ones moved nothing.
export function netPrincipal(events: readonly EarnEvent[]): Map<AssetSymbol, bigint> {
  const principal = new Map<AssetSymbol, bigint>();
  const unknown = new Set<AssetSymbol>();
  for (const event of succeededEarnEvents(events)) {
    if (event.amount === null) {
      unknown.add(event.symbol);
      continue;
    }
    principal.set(event.symbol, (principal.get(event.symbol) ?? 0n) + (event.kind === "supply" ? event.amount : -event.amount));
  }
  for (const symbol of unknown) principal.delete(symbol);
  return principal;
}

export type VaultEarnings = { symbol: AssetSymbol; earned: bigint };

// Earned interest in USD units for each deposit with a known principal: (current underlying - principal) x price.
export function vaultEarnings(deposits: readonly ValuedDeposit[], events: readonly EarnEvent[]): VaultEarnings[] {
  const principal = netPrincipal(events);
  return deposits.flatMap((deposit) => {
    const base = principal.get(deposit.symbol);
    if (base === undefined) return [];
    const gain = deposit.supplied - (base > 0n ? base : 0n);
    const unitValue = deposit.supplied === 0n ? 0n : (deposit.value * 10n ** BigInt(deposit.decimals)) / deposit.supplied;
    return [{ symbol: deposit.symbol, earned: gain > 0n ? (gain * unitValue) / 10n ** BigInt(deposit.decimals) : 0n }];
  });
}

export function totalEarned(earnings: readonly VaultEarnings[]): bigint {
  return earnings.reduce((sum, entry) => sum + entry.earned, 0n);
}
