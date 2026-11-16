import { useCallback, useEffect, useRef } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";

import { authenticate, lockState, LOCK_AFTER_MS, setLocked, useBiometricLabel, useLock } from "@/state/lock";
import { font } from "@/theme/tokens";

import { VannaMark } from "./brand";
import { Icon } from "./ui/icon";

// The lock screen over the whole app while locked: asks for the phone's biometrics at once, with a retry button.
export function AppLock() {
  const { enabled, locked } = useLock();
  const label = useBiometricLabel();
  const awayAt = useRef<number | null>(null);
  const busy = useRef(false);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const ok = await authenticate("Unlock Vanna");
    busy.current = false;
    if (ok) setLocked(false);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (!lockState().enabled) return;
      if (s === "background") awayAt.current = Date.now();
      if (s === "active" && awayAt.current && Date.now() - awayAt.current > LOCK_AFTER_MS) setLocked(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (enabled && locked) unlock();
  }, [enabled, locked, unlock]);

  if (!enabled || !locked) return null;
  return (
    <View style={styles.wrap} accessibilityViewIsModal>
      <VannaMark size={56} />
      <Text style={styles.t}>Vanna is locked</Text>
      <Pressable onPress={unlock} style={styles.btn} accessibilityRole="button">
        <Icon name={label?.includes("Face") ? "face" : "fingerprint"} size={22} color="#FFFFFF" />
        <Text style={styles.bt}>Unlock with {label ?? "your PIN"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: "#000000", alignItems: "center", justifyContent: "center", gap: 18 },
  t: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 20 },
  btn: { flexDirection: "row", alignItems: "center", gap: 10, height: 52, paddingHorizontal: 22, borderRadius: 26, backgroundColor: "#1E1D24" },
  bt: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 16 },
});
