import { useSyncExternalStore } from "react";

// Tapping the bottom bar icon of the tab you are already on sends that tab back to its main page: its screen is built again, which
// drops any sub-tab, section or scroll position it had. One counter per tab; a screen uses it as its key.
const counts: Record<string, number> = {};
const subs = new Set<() => void>();
export const resetTab = (name: string) => {
  counts[name] = (counts[name] ?? 0) + 1;
  subs.forEach((f) => f());
};
export const useTabReset = (name: string) =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => counts[name] ?? 0,
  );
