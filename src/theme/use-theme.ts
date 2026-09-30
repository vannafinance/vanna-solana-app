import { useColorScheme } from "react-native";

import { brand, fontFamily, fontSize, gradients, minTouchTarget, palette, radius, spacing } from "./tokens";

export function useTheme() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return {
    scheme,
    colors: { ...palette[scheme], ...brand },
    gradients,
    spacing,
    radius,
    fontSize,
    fontFamily,
    minTouchTarget,
  };
}

export type ThemeColor = keyof ReturnType<typeof useTheme>["colors"];
