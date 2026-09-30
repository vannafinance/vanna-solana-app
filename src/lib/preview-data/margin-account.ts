const listeners = new Set<() => void>();
let exists = true;

export function getMarginAccountExists() {
  return exists;
}

export function setMarginAccountExists(next: boolean) {
  exists = next;
  listeners.forEach((listener) => listener());
}

export function subscribeMarginAccount(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
