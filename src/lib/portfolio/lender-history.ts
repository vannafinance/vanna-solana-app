import { formatToken } from "@/format/format-amount";
import type { EarnEvent } from "@/lib/solana/earn-history";
import { assets } from "@/lib/solana/assets";
import type { LenderActivityGroup } from "@/types/portfolio";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const decimalsOf = new Map(assets.map((asset) => [asset.symbol, asset.decimals]));

function dayLabel(timestamp: number, now: Date): string {
  const date = new Date(timestamp);
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return sameDay ? "Today" : `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function groupLenderHistory(events: readonly EarnEvent[], now = new Date()): LenderActivityGroup[] {
  const groups: LenderActivityGroup[] = [];
  for (const event of events) {
    const label = dayLabel(event.timestamp, now);
    const decimals = decimalsOf.get(event.symbol) ?? 6;
    const amount = event.amount === null ? null : `${formatToken({ raw: event.amount, decimals }, 2)} ${event.symbol}`;
    const item = {
      id: `${event.signature}-${event.kind}`,
      kind: event.kind,
      title: amount === null ? `${event.kind === "supply" ? "Supplied" : "Withdrew"} ${event.symbol}` : `${event.kind === "supply" ? "Supplied" : "Withdrew"} ${amount}`,
      detail: `${event.symbol} vault · ${event.kind === "supply" ? "from wallet" : "to wallet"}`,
    } as const;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
