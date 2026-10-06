import { useSyncExternalStore } from "react";

// A control that is swiped up and down (the Farm asset pill) sits inside the page's own vertical scroll, which would take the drag.
// The control locks the page's scrolling while a finger is on it; `Screen` reads the lock.
let locked = false;
const listeners = new Set<() => void>();

export function setScrollLocked(next: boolean) {
  if (locked === next) return;
  locked = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useScrollLocked() {
  return useSyncExternalStore(subscribe, () => locked);
}
