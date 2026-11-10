import type { ReactNode } from "react";
import { Text, type TextStyle } from "react-native";

import { font } from "@/theme/tokens";

import { brand } from "./tokens";

// The few text styles the ported intro uses (shipped AppText variants).
const VARIANTS = {
  heading: { fontFamily: font.semibold, fontSize: 24, lineHeight: 32 },
  bodyLg: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
} as const;

export function AppText({ variant = "body", strong, color, style, children }: { variant?: keyof typeof VARIANTS; strong?: boolean; color?: "onHero"; style?: TextStyle; children: ReactNode }) {
  return <Text style={[VARIANTS[variant], strong && { fontFamily: font.semibold }, color === "onHero" && { color: brand.onHero }, style]}>{children}</Text>;
}
