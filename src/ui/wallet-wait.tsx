import { useEffect } from "react";
import { AppState } from "react-native";

import { launchApp } from "@/chain/native";
import { inUseWallet } from "@/state/wallets";
import type { Chain } from "@/state/chain";

/* Shared by the transaction sheets (tx.tsx, first-time-flow.tsx): the honest "waiting for your wallet" phase, the wallet timeout and
   the return of the app to the foreground. */

/** What the chain side reports while a transaction runs; the sheet shows each as its own phase. */
export type TxStatus = "waiting_for_wallet" | "sending" | "confirming";
export type TxSend = (onStatus?: (s: TxStatus) => void) => Promise<string | void>;

const PKG: Record<string, string> = {
  Phantom: "app.phantom",
  Solflare: "com.solflare.mobile",
  Backpack: "app.backpack.mobile",
  "Seed Vault": "com.solanamobile.seedvault",
};

export const WALLET_TIMEOUT_TEXT = "Your wallet did not answer. Nothing was sent. If you approved and the wallet stayed open, tap Try again.";
export const isWalletTimeout = (e: unknown) => /did not answer/i.test(e instanceof Error ? e.message : String(e ?? ""));

/** The connected wallet's name when a real external wallet signs, else null (then there is no one to wait for). */
export function externalWalletName(chain: Chain): string | null {
  const w = inUseWallet(chain);
  return w && !w.sample && w.kind === "external" ? w.app : null;
}

export const waitingLine = (app: string) => `Open ${app} and approve. Tap Confirm (unsafe) if it shows a warning`;

/** Brings the wallet app to the front (Android); false when it cannot. */
export async function openWallet(app: string): Promise<boolean> {
  const pkg = PKG[app];
  return pkg ? launchApp(pkg).catch(() => false) : false;
}

/** Calls `fn` each time the app returns to the foreground (for example back from the wallet) while `on` is true. */
export function useOnForeground(on: boolean, fn: () => void) {
  useEffect(() => {
    if (!on) return;
    const sub = AppState.addEventListener("change", (s) => s === "active" && fn());
    return () => sub.remove();
  }, [on, fn]);
}
