import { useSyncExternalStore } from "react";

import { REAL_BUILD } from "@/chain/build";
import { type Note, NOTES } from "@/sample/data";
import { type Family, families } from "@/theme/tokens";

import type { Chain } from "./chain";

// Notifications: the current chain's notes plus the account-wide ones. The design's sample notes only in a non-real build.
let notes: Note[] = REAL_BUILD ? [] : NOTES.map((n) => ({ ...n }));
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function useNotes(chain: Chain) {
  const all = useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => notes,
  );
  return all.filter((n) => (n.chain === chain || n.chain === "account"));
}

export function markRead(id?: string) {
  notes = notes.map((n) => (id == null || n.id === id ? { ...n, unread: false } : n));
  emit();
}

/** Adds a note at the top (e.g. the result of a transaction that finished after its sheet was closed). */
export function addNote(note: Note) {
  notes = [note, ...notes];
  emit();
}

const noteCat = (fam: Family): Note["cat"] =>
  fam === families.perps || fam === families.spot ? "trades" : fam === families.earn || fam === families.farm ? "earn" : "health";

/** The result of a transaction that finished after its sheet was closed, kept in Notifications. */
export function noteTxResult(chain: Chain, fam: Family, ok: boolean, title: string, msg: string) {
  addNote({ id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, chain, cat: noteCat(fam), icon: "vanna", badge: ok ? "safe" : "warning", title, msg, time: "now", unread: true });
}

export function dismissNote(id: string) {
  notes = notes.filter((n) => n.id !== id);
  emit();
}
