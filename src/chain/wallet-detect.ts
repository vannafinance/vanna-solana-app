import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DetectedWallet } from "@/chain/external";
import { installedWallets } from "@/chain/native";

// The wallet apps on this phone: every app that answers Mobile Wallet Adapter's link, as Android reports it (its own name, icon and
// package). Nothing is hardcoded, so any wallet that works with Mobile Wallet Adapter, a Seeker's Seed Vault included, appears.
// Empty on a phone without the native module (Expo Go, iOS) or with no wallet installed.
export async function detectWallets(): Promise<DetectedWallet[]> {
  const found = await installedWallets().catch(() => []);
  return found
    .filter((w) => w.packageName && w.label)
    .map((w) => ({ pkg: w.packageName, label: w.label, icon: w.icon }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Wallet apps left out of the list because they can't sign on Vanna's test network, which is a fork of mainnet. None today: Solflare checks
// every transaction against real Mainnet and needs a little real SOL in the wallet for that check (the SOL is not spent, Vanna only sends
// to its own test RPC), so it works for a wallet that has some. Add a package here if a wallet turns out to block fork transactions outright.
export const UNSUPPORTED_WALLET_PACKAGES = new Set<string>();
export const signsHere = (w: DetectedWallet) => !UNSUPPORTED_WALLET_PACKAGES.has(w.pkg);

// The wallet used to connect last time: listed first with a "Last used" tag (only on the first connect, when nothing is connected yet).
const LAST_KEY = "vanna.lastWalletPackage";
export const lastWalletPackage = () => AsyncStorage.getItem(LAST_KEY).catch(() => null);
export const rememberWalletPackage = (pkg: string) => void AsyncStorage.setItem(LAST_KEY, pkg).catch(() => {});
