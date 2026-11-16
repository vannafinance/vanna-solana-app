import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Href, router } from "expo-router";

import * as dynamic from "@/chain/dynamic";
import { markWelcomeSeen } from "@/state/session";
import { signInWithEmail } from "@/state/wallets";

// Google / X sign-in through Dynamic opens a browser tab; when it closes, Dynamic's WebAuthSession restarts the app's activity with
// NEW_TASK | CLEAR_TASK (flags 268468224). In a development build that reloads the whole JS bundle, so the screen that started the
// sign-in, and the native signInSocial call waiting in it, are gone even though Dynamic signs the person in. So the sign-in is marked
// as pending in storage, and the app finishes it from the Dynamic session, either right away (no restart) or at the next start.
const KEY = "vanna.social.pending";
const MAX_AGE_MS = 5 * 60_000;

let token = 0;

export function markSocialPending(method: "google" | "x") {
  AsyncStorage.setItem(KEY, JSON.stringify({ method, at: Date.now() })).catch(() => {});
}

export function clearSocialPending() {
  token++; // stops a running watcher
  AsyncStorage.removeItem(KEY).catch(() => {});
}

const within = <T,>(work: Promise<T>, ms: number) => Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

/** Polls Dynamic for the session of a pending social sign-in and finishes it. `onDone` runs after a successful finish. */
export async function resumeSocialSignIn(opts?: { add?: boolean; onDone?: () => void }): Promise<void> {
  if (!dynamic.available) return;
  let pending: { method: "google" | "x"; at: number } | null = null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    pending = raw ? JSON.parse(raw) : null;
  } catch {}
  if (!pending || Date.now() - pending.at > MAX_AGE_MS) {
    if (pending) AsyncStorage.removeItem(KEY).catch(() => {});
    return;
  }
  const mine = ++token;
  const label = pending.method === "google" ? "Google" : "X";
  console.warn("[social] watching for the Dynamic session", pending.method);
  await new Promise((r) => setTimeout(r, 2500));
  for (let i = 0; i < 45 && token === mine; i++) {
    const s = await within(dynamic.getSession(), 8000).catch(() => null);
    if (token !== mine) return;
    if (s && s.solanaAddress && s.stellarAddress) {
      clearSocialPending();
      console.warn("[social] session found", s.email);
      signInWithEmail(pending.method, s.email ?? label, { solana: s.solanaAddress, stellar: s.stellarAddress });
      markWelcomeSeen();
      if (opts?.add) router.back();
      else router.replace("/portfolio" as Href);
      opts?.onDone?.();
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}
