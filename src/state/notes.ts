import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

import { REAL_BUILD } from "@/chain/build";
import { type Note, NOTES } from "@/sample/data";
import { type Family, families } from "@/theme/tokens";

import type { Chain } from "./chain";
import { inUseWallet, onWalletsChanged } from "./wallets";

// Notifications: the current chain's notes plus the account-wide ones. The design's sample notes only in a non-real build.
// In a real build each wallet's notes are kept on the phone (the last 100) and come back after a restart. They are raised by the app
// itself while it runs (a transaction that finished behind a closed sheet, a health factor that crossed a limit, a position that closed:
// see note-watch.ts); nothing reaches the phone while the app is closed.
let notes: Note[] = REAL_BUILD ? [] : NOTES.map((n) => ({ ...n }));
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

let owner: string | null = null;
const nkey = (o: string) => `vanna.notes.v1.${o}`;
const persist = () => {
  if (REAL_BUILD && owner) AsyncStorage.setItem(nkey(owner), JSON.stringify(notes.slice(0, 100))).catch(() => {});
};
async function loadNotes(o: string | null) {
  owner = o;
  if (!REAL_BUILD) return;
  let saved: Note[] = [];
  try {
    const raw = o ? await AsyncStorage.getItem(nkey(o)) : null;
    saved = raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {}
  if (owner !== o) return;
  notes = saved;
  emit();
}
// the wallet in use decides whose notes show
onWalletsChanged(() => {
  const next = inUseWallet("solana")?.full ?? null;
  if (next !== owner) void loadNotes(next);
});
void loadNotes(inUseWallet("solana")?.full ?? null);

// Which kinds of notes are recorded (Account > Notifications), kept on the phone.
export type NoteKind = "health" | "trades" | "earn";
type Prefs = Record<NoteKind, boolean>;
let prefs: Prefs = { health: true, trades: true, earn: true };
const psubs = new Set<() => void>();
AsyncStorage.getItem("vanna.notePrefs")
  .then((raw) => {
    if (!raw) return;
    prefs = { ...prefs, ...(JSON.parse(raw) as Partial<Prefs>) };
    psubs.forEach((f) => f());
  })
  .catch(() => {});
export const notePrefs = () => prefs;
export const useNotePrefs = () =>
  useSyncExternalStore(
    (cb) => (psubs.add(cb), () => void psubs.delete(cb)),
    () => prefs,
  );
export function setNotePref(kind: NoteKind, on: boolean) {
  prefs = { ...prefs, [kind]: on };
  AsyncStorage.setItem("vanna.notePrefs", JSON.stringify(prefs)).catch(() => {});
  psubs.forEach((f) => f());
}

/** "now", "5m", "3h", then the date: the form the list sorts into Today and Earlier. */
export function ago(at: number): string {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useNotes(chain: Chain) {
  const all = useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => notes,
  );
  return all.filter((n) => n.chain === chain || n.chain === "account").map((n) => (n.at ? { ...n, time: ago(n.at) } : n));
}

export function markRead(id?: string) {
  notes = notes.map((n) => (id == null || n.id === id ? { ...n, unread: false } : n));
  emit();
  persist();
}

/** Adds a note at the top (unless its kind is switched off in Account). */
export function addNote(note: Note) {
  if (note.cat !== "rewards" && prefs[note.cat] === false) return;
  notes = [{ at: Date.now(), ...note }, ...notes];
  emit();
  persist();
}

const noteCat = (fam: Family): Note["cat"] =>
  fam === families.perps || fam === families.spot ? "trades" : fam === families.earn || fam === families.farm ? "earn" : "health";

/** The result of a transaction that finished after its sheet was closed, kept in Notifications. */
export function noteTxResult(chain: Chain, fam: Family, ok: boolean, title: string, msg: string) {
  addNote({ id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, chain, cat: noteCat(fam), icon: "vanna", badge: ok ? "safe" : "warning", title, msg, time: "now", at: Date.now(), unread: true });
}

export function dismissNote(id: string) {
  notes = notes.filter((n) => n.id !== id);
  emit();
  persist();
}

// Positions the app itself closed: the watcher does not announce those again.
const ownCloses = new Set<string>();
export const markOwnClose = (id: string) => void ownCloses.add(id);
export const takeOwnCloses = () => {
  const out = new Set(ownCloses);
  ownCloses.clear();
  return out;
};
