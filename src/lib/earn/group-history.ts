import { dayLabel } from "@/lib/portfolio/lender-history";
import { assets } from "@/lib/solana/assets";
import type { EarnEvent } from "@/lib/solana/earn-history";
import type { OraclePrices } from "@/lib/solana/oracle-prices";
import type { EarnHistoryEntry, EarnHistoryGroup } from "@/types/earn";

const decimalsOf = new Map(assets.map((asset) => [asset.symbol, asset.decimals]));

// Each row's dollar value is today's oracle price times the amount: history has no price at the time.
export function groupEarnHistory(events: readonly EarnEvent[], prices: OraclePrices, now: number): EarnHistoryGroup[] {
  const today = new Date(now);
  const groups: { label: string; entries: EarnHistoryEntry[] }[] = [];

  for (const event of events) {
    const decimals = decimalsOf.get(event.symbol) ?? 0;
    const price = prices[event.symbol];
    const entry: EarnHistoryEntry = {
      id: `${event.signature}-${event.kind}`,
      kind: event.kind,
      asset: event.symbol,
      amount: event.amount === null ? null : { raw: event.amount, decimals },
      usd: event.amount === null || price === undefined ? null : (event.amount * price) / 10n ** BigInt(decimals),
      signature: event.signature,
    };
    const label = dayLabel(event.timestamp, today);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }
  return groups;
}
