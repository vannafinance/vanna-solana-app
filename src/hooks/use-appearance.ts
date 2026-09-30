import { useState } from "react";
import { Appearance } from "react-native";

export type AppearancePreference = "system" | "light" | "dark";

let saved: AppearancePreference = "system";

export function useAppearance() {
  const [preference, setPreference] = useState(saved);

  const choose = (next: AppearancePreference) => {
    saved = next;
    setPreference(next);
    Appearance.setColorScheme(next === "system" ? "unspecified" : next);
  };

  return { preference, choose };
}
