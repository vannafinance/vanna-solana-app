import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PerpsSymbol } from "@/types/perps";

// The user's watched markets, kept on the device.
const KEY = "perps:watchlist";
const listeners = new Set<() => void>();
let watched: ReadonlySet<PerpsSymbol> = new Set();
let loading = false;

function publish(next: ReadonlySet<PerpsSymbol>) {
  watched = next;
  listeners.forEach((listener) => listener());
}

export function getWatchlist() {
  if (!loading) {
    loading = true;
    void AsyncStorage.getItem(KEY)
      .then((stored) => {
        const parsed: unknown = stored === null ? [] : JSON.parse(stored);
        if (Array.isArray(parsed)) publish(new Set(parsed.filter((value): value is PerpsSymbol => typeof value === "string")));
      })
      .catch(() => undefined);
  }
  return watched;
}

export function subscribeWatchlist(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleWatchlist(symbol: PerpsSymbol) {
  const next = new Set(watched);
  if (next.has(symbol)) next.delete(symbol);
  else next.add(symbol);
  publish(next);
  void AsyncStorage.setItem(KEY, JSON.stringify([...next])).catch(() => undefined);
}
