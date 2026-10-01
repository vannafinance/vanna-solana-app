import { useColorScheme } from "react-native";

import { brand, fontFamily, fontSize, gradients, layout, minTouchTarget, motion, palette, radius, shadows, spacing } from "./tokens";

export function useTheme() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return {
    scheme,
    colors: { ...palette[scheme], ...brand },
    shadow: shadows[scheme],
    layout,
    motion,
    gradients,
    spacing,
    radius,
    fontSize,
    fontFamily,
    minTouchTarget,
  };
}

export type ThemeColor = keyof ReturnType<typeof useTheme>["colors"];
