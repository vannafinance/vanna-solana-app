import { useSyncExternalStore } from "react";

/* Sample-data store: screens read the sample objects directly (sample/data.ts); a transaction mutates them through mutate(), which
   bumps a version that every screen subscribes to with useDataVersion(). Replaced by React Query when the chain adapters land. */
let version = 0;
const subs = new Set<() => void>();

export function mutate(fn: () => void) {
  fn();
  version++;
  subs.forEach((s) => s());
}

export const useDataVersion = () =>
  useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => version,
  );
