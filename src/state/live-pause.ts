import { useSyncExternalStore } from "react";

// While a transaction is being prepared or waits for the wallet, the live market sockets (chart, book, ticker) stand still: every
// tick repaints the screen behind the sheet, and on a slow device that steals the time the transaction's own network calls need.
// Two sources: the sheet's phase (setLivePaused) and every transaction still running (pauseLiveWhile), so hiding the sheet with
// its X does not restart the sockets while the transaction carries on in the background.
let sheetPaused = false;
let running = 0;
let paused = false;
const subs = new Set<() => void>();

function update() {
  const next = sheetPaused || running > 0;
  if (paused === next) return;
  paused = next;
  subs.forEach((s) => s());
}

export function setLivePaused(on: boolean) {
  sheetPaused = on;
  update();
}

/** Keeps the live sockets paused until `work` settles (resolves or rejects), whatever happens to the sheet meanwhile. */
export function pauseLiveWhile<T>(work: Promise<T>): Promise<T> {
  running++;
  update();
  return work.finally(() => {
    running--;
    update();
  });
}

export const useLivePaused = () =>
  useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => paused,
  );
