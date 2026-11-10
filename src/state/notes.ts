import { useSyncExternalStore } from "react";

import { type Note, NOTES } from "@/sample/data";

import type { Chain } from "./chain";

// Notifications (sample): the current chain's notes plus the account-wide ones; Predict notes only where Predict runs.
let notes: Note[] = NOTES.map((n) => ({ ...n }));
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function useNotes(chain: Chain) {
  const all = useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => notes,
  );
  return all.filter((n) => (n.chain === chain || n.chain === "account") && !(n.cat === "predict" && chain !== "solana"));
}

export function markRead(id?: string) {
  notes = notes.map((n) => (id == null || n.id === id ? { ...n, unread: false } : n));
  emit();
}

export function dismissNote(id: string) {
  notes = notes.filter((n) => n.id !== id);
  emit();
}
