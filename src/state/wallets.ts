import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

import type { Chain } from "@/state/chain";

// Which wallets this phone has connected and which one is in use. The wallets connect through Mobile Wallet Adapter: Android shows
// the wallets that are installed (Phantom, Solflare, Backpack, a Seeker's Seed Vault, ...), the person picks one, and the wallet's own
// answer is remembered here (its public address, the approval token and the wallet's own link) so the next transaction opens the same
// wallet and only asks to sign. Several wallets can be kept; one is "in use". Every transaction is signed in the wallet in use.
// Saved on the phone (AsyncStorage: public addresses and wallet names only, never keys).
export type WalletApp = string; // the wallet's own name ("Phantom", "Solflare", "Backpack") or "Wallet" when it does not say
export type WalletEntry = {
  id: string;
  app: WalletApp;
  logo: string;
  addr: string;
  full: string;
  kind: "external";
  sample?: boolean;
  /** The wallet's approval token: signs later without a new connection. */
  session?: string;
  /** The wallet's own link (wallet_uri_base): reopens that same wallet for the next transaction. */
  baseUri?: string;
  /** The wallet's own icon as it sent it (wallet_icon, a data: URI): shown when `logo` is not one Vanna ships. */
  icon?: string;
};

type State = {
  signedIn: boolean;
  wallets: Record<Chain, WalletEntry[]>;
  inUse: Record<Chain, string | null>;
};
let state: State = { signedIn: false, wallets: { solana: [] }, inUse: { solana: null } };
const subs = new Set<() => void>();
const changed = new Set<() => void>();
const KEY = "vanna.wallets";
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
  changed.forEach((f) => f());
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
};
// Fired after connecting, switching the wallet in use, or disconnecting. The account reader subscribes.
export const onWalletsChanged = (fn: () => void) => (changed.add(fn), () => changed.delete(fn));
// Loads the saved wallets (called once at start-up by hydrateSession).
export async function hydrateWallets() {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as Partial<State> & { wallets?: Partial<Record<string, WalletEntry[]>> };
    // Only connected (external) Solana wallets are kept; anything saved by another build (email wallets, other chains) is dropped.
    const solana = (saved.wallets?.solana ?? []).filter((w) => w.kind === "external" && !w.sample);
    const inUse = solana.some((w) => w.id === saved.inUse?.solana) ? (saved.inUse?.solana ?? null) : (solana[0]?.id ?? null);
    state = { signedIn: solana.length > 0, wallets: { solana }, inUse: { solana: inUse } };
    subs.forEach((f) => f());
    changed.forEach((f) => f());
  } catch {}
}
export const walletState = () => state;
// At most this many wallets are kept. Each wallet has its own margin account, so more than two makes it hard to tell where your funds are.
export const MAX_WALLETS = 2;
export const canAddWallet = (c: Chain) => state.wallets[c].length < MAX_WALLETS;
// The screens stop you adding past the limit. This keeps the list within it on any path that gets here anyway: the oldest entries and the newest stay.
const capped = (list: WalletEntry[]) => (list.length <= MAX_WALLETS ? list : [...list.slice(0, MAX_WALLETS - 1), list[list.length - 1]]);
export const useWallets = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => state,
  );

export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export const inUseWallet = (c: Chain) => state.wallets[c].find((w) => w.id === state.inUse[c]) ?? null;

// A wallet the person just approved. `session` and `baseUri` are what open and sign with it later without a new connection.
export function addExternalWallet(c: Chain, app: WalletApp, logo: string, full: string, session: string, baseUri?: string, icon?: string): WalletEntry {
  const w: WalletEntry = { id: `${app}-${full.slice(0, 6)}`, app, logo, addr: short(full), full, kind: "external", session, baseUri, icon };
  set({ wallets: { ...state.wallets, [c]: capped([...state.wallets[c].filter((x) => x.full !== full), w]) }, inUse: { ...state.inUse, [c]: w.id }, signedIn: true });
  return w;
}

// A wallet hands back a fresh approval token now and then; keep the newest so the next transaction only asks to sign.
export function updateWalletSession(c: Chain, id: string, session: string) {
  set({ wallets: { ...state.wallets, [c]: state.wallets[c].map((w) => (w.id === id ? { ...w, session } : w)) } });
}
// A wallet saved before Vanna could tell which app it is gets its real name and logo once it answers again (the id stays the same).
export function updateWalletIdentity(c: Chain, id: string, who: { app: WalletApp; logo: string; icon?: string }) {
  set({ wallets: { ...state.wallets, [c]: state.wallets[c].map((w) => (w.id === id ? { ...w, app: who.app, logo: who.logo, icon: who.icon ?? w.icon } : w)) } });
}
export const setWalletInUse = (c: Chain, id: string) => set({ inUse: { ...state.inUse, [c]: id } });

export function removeWallet(c: Chain, id: string) {
  const left = state.wallets[c].filter((w) => w.id !== id);
  const wallets = { ...state.wallets, [c]: left };
  const inUse = { ...state.inUse, [c]: state.inUse[c] === id ? (left[0]?.id ?? null) : state.inUse[c] };
  set({ wallets, inUse, signedIn: left.length > 0 });
}
// Disconnects every wallet on this phone. Removing one wallet is removeWallet.
export const signOut = () => set({ signedIn: false, wallets: { solana: [] }, inUse: { solana: null } });
