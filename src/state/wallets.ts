import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

import * as dynamic from "@/chain/dynamic";

import type { Chain } from "@/state/chain";

// Who is signed in and with which wallets. Several wallets per chain can be kept; one per chain is "in use".
// Switching between kept wallets needs no new approval (the wallet connection is remembered: WalletConnect sessions
// for Stellar, the Android wallet connection / Phantom session for Solana); every transaction is still signed in the
// wallet in use. Email / Google / X give one Vanna (Dynamic) wallet on each chain.
// Saved on the phone (AsyncStorage: public addresses and app names only, never keys).
export type WalletApp = "Vanna wallet" | "Phantom" | "Solflare" | "Backpack" | "Freighter" | "OneKey" | "LOBSTR";
export type WalletEntry = { id: string; app: WalletApp; logo: string; addr: string; full: string; kind: "embedded" | "external"; sample?: boolean };
export type SignIn = "email" | "google" | "x" | "wallet";

export const WALLET_APPS: Record<Chain, { app: WalletApp; logo: string; soon?: boolean }[]> = {
  solana: [{ app: "Phantom", logo: "PHANTOM" }, { app: "Solflare", logo: "SOLFLARE" }, { app: "Backpack", logo: "BACKPACK" }],
  stellar: [{ app: "Freighter", logo: "FREIGHTER" }, { app: "OneKey", logo: "ONEKEY" }, { app: "LOBSTR", logo: "LOBSTR", soon: true }],
};

type State = {
  signedIn: boolean;
  method: SignIn | null;
  email: string | null;
  wallets: Record<Chain, WalletEntry[]>;
  inUse: Record<Chain, string | null>;
  askedOther: boolean; // the "add the other chain" step was shown once
};
let state: State = { signedIn: false, method: null, email: null, wallets: { solana: [], stellar: [] }, inUse: { solana: null, stellar: null }, askedOther: false };
const subs = new Set<() => void>();
const changed = new Set<() => void>();
const KEY = "vanna.wallets";
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
  changed.forEach((f) => f());
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
};
// Fired after sign-in, switching the wallet in use, or sign-out. The account reader subscribes.
export const onWalletsChanged = (fn: () => void) => (changed.add(fn), () => changed.delete(fn));
// Loads the saved sign-in and wallets (called once at start-up by hydrateSession).
export async function hydrateWallets() {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  if (!raw) return;
  try {
    state = { ...state, ...(JSON.parse(raw) as Partial<State>) };
    subs.forEach((f) => f());
  } catch {}
}
export const walletState = () => state;
export const useWallets = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => state,
  );

// Example addresses for the stand-in connection (replaced by the wallet's real address in the development build).
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const rand = (abc: string, n: number) => Array.from({ length: n }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
const sampleAddr = (c: Chain) => (c === "solana" ? rand(B58, 44) : "G" + rand(B32, 55));
export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export const inUseWallet = (c: Chain) => state.wallets[c].find((w) => w.id === state.inUse[c]) ?? null;

// real: the Dynamic wallets' addresses (development build); without them example addresses stand in (Expo Go preview).
export function signInWithEmail(method: Exclude<SignIn, "wallet">, email: string, real?: Partial<Record<Chain, string>>) {
  const make = (c: Chain): WalletEntry => {
    const full = real?.[c] ?? sampleAddr(c);
    return { id: `vanna-${c}`, app: "Vanna wallet", logo: "VANNA", addr: short(full), full, kind: "embedded", sample: !real?.[c] };
  };
  const sol = make("solana"), xlm = make("stellar");
  set({
    signedIn: true,
    method,
    email,
    wallets: { solana: [sol, ...state.wallets.solana.filter((w) => w.kind !== "embedded")], stellar: [xlm, ...state.wallets.stellar.filter((w) => w.kind !== "embedded")] },
    inUse: { solana: sol.id, stellar: xlm.id },
    askedOther: true, // email covers both chains
  });
}

export function connectWallet(c: Chain, app: WalletApp, logo: string): WalletEntry {
  const existing = state.wallets[c].find((w) => w.app === app);
  if (existing) {
    set({ inUse: { ...state.inUse, [c]: existing.id }, signedIn: true, method: state.method ?? "wallet" });
    return existing;
  }
  const full = sampleAddr(c);
  const w: WalletEntry = { id: `${app}-${full.slice(0, 6)}`, app, logo, addr: short(full), full, kind: "external", sample: true };
  set({ wallets: { ...state.wallets, [c]: [...state.wallets[c], w] }, inUse: { ...state.inUse, [c]: w.id }, signedIn: true, method: state.method ?? "wallet" });
  return w;
}

export const setWalletInUse = (c: Chain, id: string) => set({ inUse: { ...state.inUse, [c]: id } });
const emptyWallets = (): State["wallets"] => ({ solana: [], stellar: [] });
const stillEmbedded = (wallets: State["wallets"]) => wallets.solana.concat(wallets.stellar).some((w) => w.kind === "embedded" && !w.sample);

export function removeWallet(c: Chain, id: string) {
  const left = state.wallets[c].filter((w) => w.id !== id);
  const wallets = { ...state.wallets, [c]: left };
  const inUse = { ...state.inUse, [c]: state.inUse[c] === id ? left[0]?.id ?? null : state.inUse[c] };
  const any = wallets.solana.length + wallets.stellar.length > 0;
  // The email session ends only when no Vanna email wallet is left. Other wallets stay.
  if (!stillEmbedded(wallets) && dynamic.available) dynamic.signOut().catch(() => {});
  if (!any) {
    set({ signedIn: false, method: null, email: null, wallets: emptyWallets(), inUse: { solana: null, stellar: null }, askedOther: false });
    return;
  }
  set({ wallets, inUse, signedIn: true });
}
export const markAskedOther = () => set({ askedOther: true });
// Leaves every wallet on this phone and ends the email session. Removing one wallet is removeWallet.
export const signOut = () => (dynamic.available && dynamic.signOut().catch(() => {}), set({ signedIn: false, method: null, email: null, wallets: emptyWallets(), inUse: { solana: null, stellar: null }, askedOther: false }));

// An email (Vanna) wallet for one chain only, e.g. Stellar for someone who signed in with Phantom on Solana.
export function addEmbedded(c: Chain, email: string, real?: string) {
  const full = real ?? sampleAddr(c);
  const w: WalletEntry = { id: `vanna-${c}`, app: "Vanna wallet", logo: "VANNA", addr: short(full), full, kind: "embedded", sample: !real };
  set({ email, wallets: { ...state.wallets, [c]: [w, ...state.wallets[c].filter((x) => x.kind !== "embedded")] }, inUse: { ...state.inUse, [c]: w.id } });
}
