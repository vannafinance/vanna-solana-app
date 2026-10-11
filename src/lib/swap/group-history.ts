import type { SwapHistoryEntry, SwapHistoryGroup } from "@/types/swap";

export function groupHistoryByDay(entries: readonly SwapHistoryEntry[]): SwapHistoryGroup[] {
  const groups = new Map<string, SwapHistoryEntry[]>();
  for (const entry of [...entries].sort((a, b) => b.timestamp - a.timestamp)) {
    const day = new Date(entry.timestamp).toISOString().slice(0, 10);
    groups.set(day, [...(groups.get(day) ?? []), entry]);
  }
  return [...groups].map(([day, dayEntries]) => ({ day, timestamp: dayEntries[0].timestamp, entries: dayEntries }));
}
