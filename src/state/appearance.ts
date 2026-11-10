import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";

import { crossFadeTheme } from "@/ui/theme-fade";

// Appearance (Account > Appearance): System default | Light | Dark, stored locally and applied through RN's Appearance override.
export type AppearanceMode = "system" | "light" | "dark";

const KEY = "vanna-appearance";
let mode: AppearanceMode = "system";
const subs = new Set<() => void>();

const apply = (m: AppearanceMode) => Appearance.setColorScheme(m === "system" ? "unspecified" : m);

// the saved choice applies at launch without the cross-fade
AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v === "light" || v === "dark") {
      mode = v;
      apply(v);
      subs.forEach((s) => s());
    }
  })
  .catch(() => {});

export function setAppearance(m: AppearanceMode) {
  if (m === mode) return;
  mode = m;
  crossFadeTheme(() => apply(m));
  AsyncStorage.setItem(KEY, m).catch(() => {});
  subs.forEach((s) => s());
}

export const useAppearance = () =>
  useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => mode,
  );
