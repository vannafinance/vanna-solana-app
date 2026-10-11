import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";

import { type AppearancePreference, loadPreference, savePreference } from "@/lib/appearance/preference";

export type { AppearancePreference };

let current: AppearancePreference = "system";
const listeners = new Set<() => void>();

function apply(next: AppearancePreference) {
  current = next;
  Appearance.setColorScheme(next === "system" ? "unspecified" : next);
  listeners.forEach((listener) => listener());
}

// Called once at startup, before the first screen: a first launch has nothing stored and follows the device setting.
export async function restoreAppearance(): Promise<void> {
  apply(await loadPreference());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppearance() {
  const preference = useSyncExternalStore(subscribe, () => current);

  const choose = (next: AppearancePreference) => {
    apply(next);
    void savePreference(next);
  };

  return { preference, choose };
}
