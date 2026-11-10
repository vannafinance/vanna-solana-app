import { useColorScheme } from "react-native";

import { dark, light, type Palette } from "./tokens";

export type ThemeColor = keyof Palette;

export function useTheme() {
  const isDark = useColorScheme() === "dark";
  return { colors: isDark ? dark : light, isDark };
}
