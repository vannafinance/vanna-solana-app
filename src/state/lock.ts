import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Platform } from "react-native";

// App lock with the phone's own biometrics (expo-local-authentication, works in Expo Go too).
// Android: fingerprint and/or face unlock (whatever the phone counts as secure); iPhone: Face ID or Touch ID.
// If none is set up, the phone's PIN / passcode is the fallback. Locks on open and after 5 minutes in the background.
export const LOCK_AFTER_MS = 5 * 60 * 1000;
type State = { enabled: boolean; locked: boolean; confirmTx: boolean };
let state: State = { enabled: false, locked: false, confirmTx: false };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => ((state = { ...state, ...p }), subs.forEach((f) => f()));
export const lockState = () => state;

// Saved on the phone: before, a restart forgot both switches. With the lock on, the app opens locked.
const KEY = "vanna-lock";
const save = () => AsyncStorage.setItem(KEY, JSON.stringify({ enabled: state.enabled, confirmTx: state.confirmTx })).catch(() => {});
AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    const s = JSON.parse(raw) as Partial<State>;
    set({ enabled: !!s.enabled, confirmTx: !!s.confirmTx, locked: !!s.enabled });
  })
  .catch(() => {});

// The icon for a transaction button: the phone's fingerprint or face only while biometrics for transactions is on, else none.
export const bioIcon = (): "face" | "fingerprint" | undefined => (state.confirmTx ? (Platform.OS === "ios" ? "face" : "fingerprint") : undefined);
export const useLock = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => state,
  );
export const setLocked = (locked: boolean) => set({ locked });

// What to call it on this phone: "Face ID", "Touch ID", "Fingerprint", "Face unlock", "Fingerprint or face", or null.
export async function biometricLabel(): Promise<string | null> {
  if (!(await LocalAuthentication.hasHardwareAsync().catch(() => false))) return null;
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync().catch(() => [] as LocalAuthentication.AuthenticationType[]);
  const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  if (Platform.OS === "ios") return face ? "Face ID" : finger ? "Touch ID" : null;
  if (finger && face) return "Fingerprint or face";
  return finger ? "Fingerprint" : face ? "Face unlock" : null;
}
export function useBiometricLabel() {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    biometricLabel().then(setLabel);
  }, []);
  return label;
}

export async function authenticate(reason: string): Promise<boolean> {
  const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: "Cancel", disableDeviceFallback: false, fallbackLabel: enrolled ? "Use PIN" : undefined }).catch(() => ({ success: false }));
  return r.success;
}

// Confirm every transaction with the phone's biometrics (V7 Security for email accounts). Turning it on asks once.
export async function setConfirmTx(on: boolean): Promise<boolean> {
  if (on && !(await authenticate("Confirm transactions with biometrics"))) return false;
  set({ confirmTx: on });
  save();
  return true;
}

// Turning the lock on asks once, so nobody enables it without being able to unlock.
export async function setLockEnabled(on: boolean): Promise<boolean> {
  if (on && !(await authenticate("Turn on app lock"))) return false;
  set({ enabled: on, locked: false });
  save();
  return true;
}
