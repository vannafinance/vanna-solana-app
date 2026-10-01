import AsyncStorage from "@react-native-async-storage/async-storage";

// When the user last marked notifications read, per wallet, kept on the device. Until it has loaded,
// nothing counts as unread, so the badge never flashes a wrong number on start.
type Seen = { loaded: boolean; at: number; healthAcknowledged: boolean };

const KEY_PREFIX = "notifications:seen:";
const listeners = new Set<() => void>();
const state = new Map<string, Seen>();
const NOT_LOADED: Seen = { loaded: false, at: Number.MAX_SAFE_INTEGER, healthAcknowledged: true };

function publish(wallet: string, seen: Seen) {
  state.set(wallet, seen);
  listeners.forEach((listener) => listener());
}

export function subscribeSeen(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSeen(wallet: string): Seen {
  const current = state.get(wallet);
  if (current) return current;
  state.set(wallet, NOT_LOADED);
  void AsyncStorage.getItem(KEY_PREFIX + wallet)
    .then((stored) => publish(wallet, { loaded: true, at: stored === null ? 0 : Number(stored) || 0, healthAcknowledged: false }))
    .catch(() => publish(wallet, { loaded: true, at: 0, healthAcknowledged: false }));
  return NOT_LOADED;
}

export function markSeen(wallet: string, at: number) {
  publish(wallet, { loaded: true, at, healthAcknowledged: true });
  void AsyncStorage.setItem(KEY_PREFIX + wallet, String(at)).catch(() => undefined);
}
